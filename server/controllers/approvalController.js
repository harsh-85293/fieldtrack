import User from '../models/User.js';
import { AppError } from '../utils/helpers.js';
import { isDBConnected } from '../config/database.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * GET /api/v1/employees/pending
 * Admin: list pending OAuth registrations.
 */
export async function listPendingEmployees(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const users = await User.find({
      provider: 'google',
      status: 'pending',
    }).sort('-createdAt');

    res.json({ success: true, data: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id/approve
 * Admin: approve a pending OAuth registration.
 */
export async function approveEmployee(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role === 'admin') throw new AppError('Cannot approve an administrator account', 400);
    if (user.status !== 'pending') {
      throw new AppError(`Account is not pending (current status: ${user.status})`, 400);
    }

    const before = user.toSafeJSON();
    user.status = 'active';
    user.isActive = true;
    user.rejectionReason = null;
    await user.save();

    await logAudit({
      req,
      action: 'employee.approve',
      entity: 'User',
      entityId: user._id,
      description: `Approved employee ${user.email}`,
      before,
      after: user.toSafeJSON(),
    });

    res.json({
      success: true,
      message: 'Employee approved',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id/reject
 * Admin: reject a pending OAuth registration with a reason.
 */
export async function rejectEmployee(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      throw new AppError('A rejection reason is required', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role === 'admin') throw new AppError('Cannot reject an administrator account', 400);
    if (user.status !== 'pending') {
      throw new AppError(`Account is not pending (current status: ${user.status})`, 400);
    }

    const before = user.toSafeJSON();
    user.status = 'rejected';
    user.isActive = false;
    user.rejectionReason = reason.trim();
    await user.save();

    await logAudit({
      req,
      action: 'employee.reject',
      entity: 'User',
      entityId: user._id,
      description: `Rejected employee ${user.email}: ${reason.trim()}`,
      before,
      after: user.toSafeJSON(),
    });

    res.json({
      success: true,
      message: 'Registration rejected',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id/suspend
 * Admin: suspend an active employee account.
 */
export async function suspendEmployee(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role === 'admin') throw new AppError('Cannot suspend an administrator account', 400);

    const before = user.toSafeJSON();
    user.status = 'suspended';
    user.isActive = false;
    await user.save();

    await logAudit({
      req,
      action: 'employee.suspend',
      entity: 'User',
      entityId: user._id,
      description: `Suspended employee ${user.email}`,
      before,
      after: user.toSafeJSON(),
    });

    res.json({
      success: true,
      message: 'Employee suspended',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id/reactivate
 * Admin: reactivate a suspended employee account.
 */
export async function reactivateEmployee(req, res, next) {
  try {
    if (!isDBConnected()) {
      throw new AppError('Database is currently unavailable. Please try again later.', 503);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role === 'admin') throw new AppError('Cannot modify an administrator account', 400);

    const before = user.toSafeJSON();
    user.status = 'active';
    user.isActive = true;
    user.rejectionReason = null;
    await user.save();

    await logAudit({
      req,
      action: 'employee.reactivate',
      entity: 'User',
      entityId: user._id,
      description: `Reactivated employee ${user.email}`,
      before,
      after: user.toSafeJSON(),
    });

    res.json({
      success: true,
      message: 'Employee reactivated',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}
