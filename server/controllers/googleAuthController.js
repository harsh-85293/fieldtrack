import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { AppError } from '../utils/helpers.js';
import { isDBConnected } from '../config/database.js';
import logAudit from '../middleware/auditMiddleware.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Verify a Google ID token and return the verified payload.
 * Audience is validated against GOOGLE_CLIENT_ID. email_verified must be true.
 */
async function verifyGoogleToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google OAuth is not configured on the server', 500);
  }
  if (!idToken || typeof idToken !== 'string') {
    throw new AppError('Google credential is required', 400);
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError('Invalid Google token', 401);
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new AppError('Invalid Google token payload', 401);
  }

  if (!payload.email_verified) {
    throw new AppError('Google email is not verified', 401);
  }

  if (!payload.sub || !payload.email) {
    throw new AppError('Google token is missing required fields', 401);
  }

  return {
    providerId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || null,
  };
}

/**
 * Check the email domain against ALLOWED_GOOGLE_DOMAINS if configured.
 */
function assertAllowedDomain(email) {
  const allowed = process.env.ALLOWED_GOOGLE_DOMAINS;
  if (!allowed) return;
  const domains = allowed
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return;
  const domain = email.split('@')[1];
  if (!domain || !domains.includes(domain)) {
    throw new AppError(
      `Registration is restricted to company email domains (${domains.join(', ')})`,
      403,
    );
  }
}

/**
 * POST /api/v1/auth/google
 * Verify the Google credential, create a pending employee if new,
 * or authenticate an existing user. Never creates an admin.
 */
export async function googleAuth(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }

    const { credential } = req.body;
    const profile = await verifyGoogleToken(credential);
    assertAllowedDomain(profile.email);

    // Find by providerId or email
    let user = await User.findOne({
      $or: [
        { providerId: profile.providerId },
        { email: profile.email },
      ],
    });

    if (user) {
      // Existing user
      if (user.providerId && user.providerId !== profile.providerId) {
        throw new AppError('An account with this email already exists', 409);
      }

      if (user.status === 'suspended') {
        throw new AppError('Your account has been suspended. Please contact an administrator.', 403);
      }
      if (user.status === 'rejected') {
        throw new AppError('Your registration was rejected. Please contact an administrator.', 403);
      }
      if (user.status === 'pending') {
        return res.json({
          success: true,
          status: 'pending',
          message: 'Your account is waiting for administrator approval.',
          data: user.toSafeJSON(),
        });
      }

      // active
      if (!user.isActive) {
        throw new AppError('Account is deactivated', 403);
      }

      user.lastLoginAt = new Date();
      if (!user.providerId) {
        user.provider = 'google';
        user.providerId = profile.providerId;
      }
      if (!user.profilePicture && profile.picture) {
        user.profilePicture = profile.picture;
      }
      await user.save({ validateBeforeSave: false });

      // Issue session for active OAuth user
      const token = signToken(user._id);
      setTokenCookie(res, token);

      await logAudit({
        req,
        action: 'auth.googleLogin',
        entity: 'User',
        entityId: user._id,
        description: `${user.email} logged in via Google`,
      });

      return res.json({
        success: true,
        status: 'active',
        message: 'Login successful',
        data: user.toSafeJSON(),
      });
    }

    // New user — create pending employee
    user = await User.create({
      role: 'employee',
      email: profile.email,
      fullName: profile.name,
      profilePicture: profile.picture,
      provider: 'google',
      providerId: profile.providerId,
      status: 'pending',
      isActive: false,
    });

    await logAudit({
      req,
      action: 'auth.googleSignup',
      entity: 'User',
      entityId: user._id,
      description: `New Google registration (pending): ${user.email}`,
    });

    return res.status(201).json({
      success: true,
      status: 'pending',
      message: 'Registration submitted. Your account is waiting for administrator approval.',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/google/complete-profile
 * A pending Google user completes their Employee ID and phone number.
 */
export async function completeGoogleProfile(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }

    const { providerId, employeeId, phone } = req.body;
    if (!providerId || !employeeId || !phone) {
      throw new AppError('providerId, employeeId and phone are required', 400);
    }

    const user = await User.findOne({ providerId });
    if (!user) {
      throw new AppError('No Google account found for this credential', 404);
    }
    if (user.provider !== 'google') {
      throw new AppError('This account is not a Google account', 400);
    }

    // Uniqueness checks
    const existingId = await User.findOne({
      employeeId: employeeId.toUpperCase().trim(),
      _id: { $ne: user._id },
    });
    if (existingId) {
      throw new AppError('Employee ID is already in use', 409);
    }

    user.employeeId = employeeId.toUpperCase().trim();
    user.phone = phone.trim();
    await user.save();

    await logAudit({
      req,
      action: 'auth.googleCompleteProfile',
      entity: 'User',
      entityId: user._id,
      description: `${user.email} completed profile (pending approval)`,
    });

    res.json({
      success: true,
      status: 'pending',
      message: 'Registration submitted successfully. Your account is waiting for administrator approval.',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}
