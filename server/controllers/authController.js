import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import EmployeeProfile from '../models/EmployeeProfile.js';
import { AppError } from '../utils/helpers.js';
import { ROLES } from '../config/constants.js';
import { isDBConnected } from '../config/database.js';
import logAudit from '../middleware/auditMiddleware.js';

const isDBConnectedSafe = () => isDBConnected();

/**
 * Generate a JWT and set it as an HTTP-only cookie.
 * remember=true  → long-lived token + persistent cookie (30d)
 * remember=false → shorter token + session cookie (cleared when browser closes)
 */
function signToken(userId, remember = false) {
  const expiresIn = remember
    ? (process.env.JWT_REMEMBER_EXPIRES_IN || '30d')
    : (process.env.JWT_EXPIRES_IN || '1d');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
}

function setTokenCookie(res, token, remember = false) {
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    secure: isProd, // required with SameSite=None
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
  if (remember) {
    options.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  // No maxAge → browser session cookie (expires on browser close)
  res.cookie('token', token, options);
}

/**
 * POST /api/v1/auth/login
 * Login by email or employeeId. Sets HTTP-only cookie.
 */
export async function login(req, res, next) {
  try {
    if (!isDBConnectedSafe()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const { identifier, password, remember } = req.body;
    if (!identifier || !password) {
      throw new AppError('Please provide identifier and password', 400);
    }

    const normalizedIdentifier = String(identifier).toLowerCase().trim();
    const normalizedPassword = String(password).trim();

    // Try to find user by email or employeeId
    const query = {
      $or: [
        { email: normalizedIdentifier },
        { employeeId: String(identifier).toUpperCase().trim() },
      ],
    };

    const user = await User.findOne(query).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }
    if (user.status === 'pending') {
      throw new AppError('Your account is pending admin approval', 403);
    }
    if (user.status === 'suspended') {
      throw new AppError('Your account has been suspended', 403);
    }
    if (user.status === 'rejected') {
      throw new AppError('Your registration was rejected', 403);
    }

    const isMatch = await user.matchPassword(normalizedPassword);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, Boolean(remember));
    setTokenCookie(res, token, Boolean(remember));

    await logAudit({
      req,
      action: 'auth.login',
      entity: 'User',
      entityId: user._id,
      description: `${user.email} logged in`,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(req, res, next) {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 0,
    });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/auth/change-password
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current and new passwords', 400);
    }
    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Issue a new token since the old one is now invalid
    const token = signToken(user._id);
    setTokenCookie(res, token);

    await logAudit({
      req,
      action: 'auth.changePassword',
      entity: 'User',
      entityId: user._id,
      description: `${user.email} changed password`,
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/admin/create-user
 * Admin-only: create a new user (admin or employee) with an optional profile.
 */
export async function adminCreateUser(req, res, next) {
  const session = await mongoose.startSession();
  try {
    const {
      role,
      employeeId,
      email,
      password,
      fullName,
      phone,
      designation,
      department,
      address,
      city,
      state,
      postalCode,
      dateOfBirth,
      joiningDate,
      mustChangePassword,
    } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError('email, password, and fullName are required', 400);
    }

    session.startTransaction();

    const [user] = await User.create(
      [
        {
          role: role || ROLES.EMPLOYEE,
          employeeId: employeeId || undefined,
          email,
          password,
          fullName,
          phone,
          mustChangePassword: mustChangePassword ?? true,
        },
      ],
      { session },
    );

    if (user.role === ROLES.EMPLOYEE) {
      await EmployeeProfile.create(
        [
          {
            user: user._id,
            designation,
            department,
            address,
            city,
            state,
            postalCode,
            dateOfBirth,
            joiningDate,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      req,
      action: 'user.create',
      entity: 'User',
      entityId: user._id,
      description: `Created ${user.role} user ${user.email}`,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    next(err);
  }
}
