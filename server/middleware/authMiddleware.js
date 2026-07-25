import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/helpers.js';
import { ROLES } from '../config/constants.js';

/**
 * Protect middleware: verifies JWT from cookie or Authorization header,
 * loads the user, and checks account status + password freshness.
 */
export async function protect(req, res, next) {
  try {
    let token;

    // Prefer HTTP-only cookie, fall back to Bearer header
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized, no token provided', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new AppError('Not authorized, invalid or expired token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }
    if (user.status === 'pending') {
      throw new AppError('Your account is pending administrator approval', 403);
    }
    if (user.status === 'suspended') {
      throw new AppError('Your account has been suspended', 403);
    }
    if (user.status === 'rejected') {
      throw new AppError('Your registration was rejected', 403);
    }

    // If password changed after token was issued, reject the token
    if (
      user.passwordChangedAt &&
      decoded.iat &&
      user.passwordChangedAt.getTime() > decoded.iat * 1000
    ) {
      throw new AppError('Password changed recently, please log in again', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based authorization. Pass allowed role names.
 * @param {...string} roles
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not permitted to perform this action`, 403));
    }
    next();
  };
}

/** Only admin users may pass. */
export const adminOnly = authorize(ROLES.ADMIN);

/** Both admin and employee may pass. */
export const employeeOrAdmin = authorize(ROLES.ADMIN, ROLES.EMPLOYEE);
