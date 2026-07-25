import WorkSession from '../models/WorkSession.js';
import LocationPoint from '../models/LocationPoint.js';
import { AppError } from '../utils/helpers.js';
import { isGpsPointValid, getPagination, paginateResult, startOfDayUTC, endOfDayUTC } from '../utils/geo.js';
import { SESSION_STATUS, SYNC_STATUS } from '../config/constants.js';

/**
 * POST /api/v1/locations
 * Employee: submit a batch of location points.
 * Each point is validated with isGpsPointValid; valid ones get status 'synced',
 * invalid ones get status 'rejected' with a reason.
 */
export async function submitLocations(req, res, next) {
  try {
    const { sessionId, points } = req.body;

    if (!sessionId) {
      throw new AppError('sessionId is required', 400);
    }
    if (!Array.isArray(points) || points.length === 0) {
      throw new AppError('points array is required', 400);
    }

    // Verify the session belongs to the user and is active
    const session = await WorkSession.findOne({
      _id: sessionId,
      employee: req.user._id,
    });
    if (!session) {
      throw new AppError('Session not found', 404);
    }
    if (session.status !== SESSION_STATUS.ACTIVE) {
      throw new AppError('Session is not active', 400);
    }

    // Sort points by clientTimestamp for sequential validation
    const sorted = [...points].sort((a, b) => new Date(a.clientTimestamp) - new Date(b.clientTimestamp));

    const docs = [];
    let prev = null;

    for (const pt of sorted) {
      const checkPoint = {
        latitude: pt.latitude,
        longitude: pt.longitude,
        accuracy: pt.accuracy,
        speed: pt.speed,
        clientTimestamp: typeof pt.clientTimestamp === 'number' ? pt.clientTimestamp : new Date(pt.clientTimestamp).getTime(),
      };

      const result = isGpsPointValid(checkPoint, prev);

      const doc = {
        employee: req.user._id,
        session: session._id,
        latitude: pt.latitude,
        longitude: pt.longitude,
        accuracy: pt.accuracy,
        speed: pt.speed,
        heading: pt.heading,
        clientTimestamp: pt.clientTimestamp,
        serverTimestamp: new Date(),
        status: result.valid ? SYNC_STATUS.SYNCED : SYNC_STATUS.REJECTED,
        rejectReason: result.valid ? undefined : result.reason,
      };
      docs.push(doc);

      // Only use valid points as the "previous" reference for the next check
      if (result.valid) {
        prev = checkPoint;
      }
    }

    if (docs.length > 0) {
      await LocationPoint.insertMany(docs, { ordered: false });
    }

    const synced = docs.filter((d) => d.status === SYNC_STATUS.SYNCED).length;
    const rejected = docs.length - synced;

    res.status(201).json({
      success: true,
      message: `${synced} point(s) synced, ${rejected} rejected`,
      data: { synced, rejected, total: docs.length },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/locations/me
 * Employee: get own location points for a date range or session.
 */
export async function getMyLocations(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { sessionId, startDate, endDate } = req.query;
    const filter = { employee: req.user._id };
    if (sessionId) filter.session = sessionId;
    if (startDate || endDate) {
      filter.clientTimestamp = {};
      if (startDate) filter.clientTimestamp.$gte = startOfDayUTC(startDate);
      if (endDate) filter.clientTimestamp.$lte = endOfDayUTC(endDate);
    }
    const [total, locations] = await Promise.all([
      LocationPoint.countDocuments(filter),
      LocationPoint.find(filter).sort('-clientTimestamp').skip(skip).limit(limit),
    ]);
    res.json({ success: true, data: paginateResult(locations, total, page, limit) });
  } catch (err) {
    next(err);
  }
}
