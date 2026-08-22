import mongoose from 'mongoose';
import User from '../models/User.js';
import EmployeeProfile from '../models/EmployeeProfile.js';
import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import { AppError } from '../utils/helpers.js';
import { getPagination, paginateResult, startOfDayUTC, endOfDayUTC, generateRandomPassword } from '../utils/geo.js';
import { ROLES } from '../config/constants.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * GET /api/v1/employees
 * Admin: list all employees with search/filter/pagination.
 */
export async function listEmployees(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, role, isActive } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    ]);

    // Attach profiles
    const userIds = users.map((u) => u._id);
    const profiles = await EmployeeProfile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const data = users.map((u) => ({
      ...u.toSafeJSON(),
      profile: profileMap.get(u._id.toString()) || null,
    }));

    res.json({ success: true, data: paginateResult(data, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/:id
 */
export async function getEmployee(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    const profile = await EmployeeProfile.findOne({ user: user._id });
    res.json({ success: true, data: { ...user.toSafeJSON(), profile } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/employees
 * Admin: create employee with profile (transaction).
 */
export async function createEmployee(req, res, next) {
  const session = await mongoose.startSession();
  try {
    const {
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
      avatarColor,
    } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError('email, password, and fullName are required', 400);
    }

    session.startTransaction();

    const [user] = await User.create(
      [
        {
          role: ROLES.EMPLOYEE,
          employeeId: employeeId || undefined,
          email,
          password,
          fullName,
          phone,
          mustChangePassword: true,
        },
      ],
      { session },
    );

    const [profile] = await EmployeeProfile.create(
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
          avatarColor,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      req,
      action: 'employee.create',
      entity: 'User',
      entityId: user._id,
      description: `Created employee ${user.email}`,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created',
      data: { ...user.toSafeJSON(), profile },
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    next(err);
  }
}

/**
 * PUT /api/v1/employees/:id
 */
export async function updateEmployee(req, res, next) {
  try {
    const {
      fullName,
      phone,
      employeeId,
      designation,
      department,
      address,
      city,
      state,
      postalCode,
      dateOfBirth,
      joiningDate,
      avatarColor,
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role !== ROLES.EMPLOYEE) throw new AppError('Can only update employee accounts', 400);

    const before = user.toSafeJSON();

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (employeeId !== undefined) user.employeeId = employeeId || undefined;
    await user.save();

    const profileFields = { designation, department, address, city, state, postalCode, dateOfBirth, joiningDate, avatarColor };
    let profile = await EmployeeProfile.findOne({ user: user._id });
    if (!profile) {
      profile = new EmployeeProfile({ user: user._id });
    }
    for (const [k, v] of Object.entries(profileFields)) {
      if (v !== undefined) profile[k] = v;
    }
    await profile.save();

    await logAudit({
      req,
      action: 'employee.update',
      entity: 'User',
      entityId: user._id,
      description: `Updated employee ${user.email}`,
      before,
      after: user.toSafeJSON(),
    });

    res.json({ success: true, message: 'Employee updated', data: { ...user.toSafeJSON(), profile } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id/toggle-status
 */
export async function toggleEmployeeStatus(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);
    if (user.role === ROLES.ADMIN) throw new AppError('Cannot toggle admin status', 400);

    const before = user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    await logAudit({
      req,
      action: 'employee.toggleStatus',
      entity: 'User',
      entityId: user._id,
      description: `${user.email} status set to ${user.isActive}`,
      before: { isActive: before },
      after: { isActive: user.isActive },
    });

    res.json({ success: true, message: `Employee ${user.isActive ? 'activated' : 'deactivated'}`, data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/employees/:id/reset-password
 * Admin sets a new password; user must change it on next login.
 */
export async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Employee not found', 404);

    user.password = newPassword || generateRandomPassword(12);
    user.mustChangePassword = true;
    user.passwordChangedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'employee.resetPassword',
      entity: 'User',
      entityId: user._id,
      description: `Password reset for ${user.email}`,
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/me/profile
 */
export async function getMyProfile(req, res, next) {
  try {
    const profile = await EmployeeProfile.findOne({ user: req.user._id });
    res.json({ success: true, data: { ...req.user.toSafeJSON(), profile } });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/employees/me/profile
 */
export async function updateMyProfile(req, res, next) {
  try {
    const { phone, designation, department, address, city, state, postalCode, dateOfBirth, avatarColor } = req.body;

    const user = await User.findById(req.user._id);
    if (phone !== undefined) user.phone = phone;
    await user.save();

    let profile = await EmployeeProfile.findOne({ user: user._id });
    if (!profile) {
      profile = new EmployeeProfile({ user: user._id });
    }
    const fields = { designation, department, address, city, state, postalCode, dateOfBirth, avatarColor };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) profile[k] = v;
    }
    await profile.save();

    res.json({ success: true, message: 'Profile updated', data: { ...user.toSafeJSON(), profile } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/me/attendance
 * Employee: own attendance (sessions) for a date range.
 */
export async function getMyAttendance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const filter = { employee: req.user._id };
    if (startDate || endDate) {
      filter.sessionDate = {};
      if (startDate) filter.sessionDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.sessionDate.$lte = endOfDayUTC(endDate);
    }
    const sessions = await WorkSession.find(filter).sort('-sessionDate');
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/:id/attendance
 * Admin: attendance for a specific employee.
 */
export async function getEmployeeAttendance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const filter = { employee: req.params.id };
    if (startDate || endDate) {
      filter.sessionDate = {};
      if (startDate) filter.sessionDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.sessionDate.$lte = endOfDayUTC(endDate);
    }
    const sessions = await WorkSession.find(filter).sort('-sessionDate');
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/:id/visits
 * Admin: visits for a specific employee.
 */
export async function getEmployeeVisits(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { startDate, endDate } = req.query;
    const filter = { employee: req.params.id };
    if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) filter.visitDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.visitDate.$lte = endOfDayUTC(endDate);
    }
    const [total, visits] = await Promise.all([
      StoreVisit.countDocuments(filter),
      StoreVisit.find(filter).populate('store', 'name code city').sort('-visitDate').skip(skip).limit(limit),
    ]);
    res.json({ success: true, data: paginateResult(visits, total, page, limit) });
  } catch (err) {
    next(err);
  }
}
