import WorkSession from '../models/WorkSession.js';
import LocationPoint from '../models/LocationPoint.js';
import { AppError } from '../utils/helpers.js';
import { calculateRouteDistanceKm, startOfDayUTC, endOfDayUTC, getPagination, paginateResult } from '../utils/geo.js';
import { SESSION_STATUS } from '../config/constants.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * POST /api/v1/sessions/check-in
 * Employee: start a new work session.
 */
export async function checkIn(req, res, next) {
  try {
    const { latitude, longitude, accuracy, deviceInfo } = req.body;

    if (latitude == null || longitude == null) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    // Only one active session at a time (multiple completed sessions per day are allowed)
    const existing = await WorkSession.findOne({
      employee: req.user._id,
      status: SESSION_STATUS.ACTIVE,
    });
    if (existing) {
      throw new AppError('You already have an active session. Please check out first.', 409);
    }

    const now = new Date();

    const session = await WorkSession.create({
      employee: req.user._id,
      sessionDate: now,
      checkInAt: now,
      checkInLocation: { lat: latitude, lng: longitude, accuracy: accuracy || null },
      status: SESSION_STATUS.ACTIVE,
      deviceInfo: deviceInfo || undefined,
    });

    await logAudit({
      req,
      action: 'session.checkIn',
      entity: 'WorkSession',
      entityId: session._id,
      description: `${req.user.email} checked in`,
    });

    res.status(201).json({ success: true, message: 'Checked in', data: session });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sessions/check-out
 * Employee: end active session. Calculates duration and route distance from LocationPoints.
 */
export async function checkOut(req, res, next) {
  try {
    const { latitude, longitude, accuracy } = req.body;

    const session = await WorkSession.findOne({
      employee: req.user._id,
      status: SESSION_STATUS.ACTIVE,
    });
    if (!session) {
      throw new AppError('No active session to check out', 404);
    }

    const now = new Date();

    // Calculate duration
    const totalDurationMs = now - session.checkInAt;

    // Calculate distance from synced location points + check-in/out anchors
    const points = await LocationPoint.find({
      session: session._id,
      status: 'synced',
    }).sort('clientTimestamp');

    const routePoints = [];
    if (session.checkInLocation?.lat != null && session.checkInLocation?.lng != null) {
      routePoints.push({
        latitude: session.checkInLocation.lat,
        longitude: session.checkInLocation.lng,
      });
    }
    for (const p of points) {
      routePoints.push({ latitude: p.latitude, longitude: p.longitude });
    }
    const checkOutLat = latitude != null ? latitude : session.checkOutLocation?.lat;
    const checkOutLng = longitude != null ? longitude : session.checkOutLocation?.lng;
    if (checkOutLat != null && checkOutLng != null) {
      routePoints.push({ latitude: checkOutLat, longitude: checkOutLng });
    }
    const totalDistanceKm = calculateRouteDistanceKm(routePoints);

    session.checkOutAt = now;
    if (latitude != null && longitude != null) {
      session.checkOutLocation = { lat: latitude, lng: longitude, accuracy: accuracy || null };
    }
    session.status = SESSION_STATUS.COMPLETED;
    session.totalDurationMs = totalDurationMs;
    session.totalDistanceKm = totalDistanceKm;
    await session.save();

    await logAudit({
      req,
      action: 'session.checkOut',
      entity: 'WorkSession',
      entityId: session._id,
      description: `${req.user.email} checked out. Duration: ${(totalDurationMs / 3600000).toFixed(2)}h, Distance: ${totalDistanceKm.toFixed(2)}km`,
    });

    res.json({ success: true, message: 'Checked out', data: session });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sessions/me/active
 */
export async function getMyActiveSession(req, res, next) {
  try {
    const session = await WorkSession.findOne({
      employee: req.user._id,
      status: SESSION_STATUS.ACTIVE,
    });
    if (!session) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sessions/me
 * Employee: list own sessions.
 */
export async function getMySessions(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { startDate, endDate, date, status } = req.query;
    const filter = { employee: req.user._id };
    if (status) filter.status = status;
    if (date) {
      filter.sessionDate = { $gte: startOfDayUTC(date), $lte: endOfDayUTC(date) };
    } else if (startDate || endDate) {
      filter.sessionDate = {};
      if (startDate) filter.sessionDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.sessionDate.$lte = endOfDayUTC(endDate);
    }
    const [total, sessions] = await Promise.all([
      WorkSession.countDocuments(filter),
      WorkSession.find(filter).sort('-sessionDate').skip(skip).limit(limit),
    ]);
    res.json({ success: true, data: paginateResult(sessions, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sessions/:id
 */
export async function getSession(req, res, next) {
  try {
    const session = await WorkSession.findById(req.params.id).populate('employee', 'fullName email employeeId');
    if (!session) throw new AppError('Session not found', 404);

    // Employees can only view their own sessions
    if (req.user.role === 'employee' && session.employee._id.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to view this session', 403);
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sessions/:id/route
 * Returns all location points for the session as a route.
 */
export async function getSessionRoute(req, res, next) {
  try {
    const session = await WorkSession.findById(req.params.id);
    if (!session) throw new AppError('Session not found', 404);

    if (req.user.role === 'employee' && session.employee.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to view this route', 403);
    }

    const points = await LocationPoint.find({ session: session._id, status: 'synced' }).sort('clientTimestamp');
    res.json({ success: true, data: points });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sessions
 * Admin: list all sessions.
 */
export async function listSessions(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { employee, employeeId, status, startDate, endDate } = req.query;
    const filter = {};
    if (employee || employeeId) filter.employee = employee || employeeId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.sessionDate = {};
      if (startDate) filter.sessionDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.sessionDate.$lte = endOfDayUTC(endDate);
    }
    const [total, sessions] = await Promise.all([
      WorkSession.countDocuments(filter),
      WorkSession.find(filter).populate('employee', 'fullName email employeeId').sort('-sessionDate').skip(skip).limit(limit),
    ]);
    res.json({ success: true, data: paginateResult(sessions, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/sessions/:id/correct
 * Admin: correct a session (requires reason).
 */
export async function correctSession(req, res, next) {
  try {
    const { reason, checkInAt, checkOutAt, totalDistanceKm, totalDurationMs } = req.body;
    if (!reason || !reason.trim()) {
      throw new AppError('Correction reason is required', 400);
    }

    const session = await WorkSession.findById(req.params.id);
    if (!session) throw new AppError('Session not found', 404);

    const before = session.toObject();

    if (checkInAt !== undefined) session.checkInAt = checkInAt;
    if (checkOutAt !== undefined) session.checkOutAt = checkOutAt;
    if (totalDistanceKm !== undefined) session.totalDistanceKm = totalDistanceKm;
    if (totalDurationMs !== undefined) session.totalDurationMs = totalDurationMs;
    session.corrected = true;
    session.correctionReason = reason;
    session.correctedBy = req.user._id;
    await session.save();

    await logAudit({
      req,
      action: 'session.correct',
      entity: 'WorkSession',
      entityId: session._id,
      description: `Session corrected: ${reason}`,
      before,
      after: session.toObject(),
    });

    res.json({ success: true, message: 'Session corrected', data: session });
  } catch (err) {
    next(err);
  }
}
