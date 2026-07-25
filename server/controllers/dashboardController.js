import User from '../models/User.js';
import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import LocationPoint from '../models/LocationPoint.js';
import { ROLES, SESSION_STATUS } from '../config/constants.js';
import { startOfDayUTC, endOfDayUTC, fromMinorUnits } from '../utils/geo.js';

/**
 * GET /api/v1/dashboard/summary
 * Returns: total active employees, checked in, absent, sessions, visits, distance, quantity, value.
 */
export async function getSummary(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = startOfDayUTC(targetDate);
    const dayEnd = endOfDayUTC(targetDate);

    const [totalActiveEmployees, activeSessions, completedSessions, visits, locationPoints] = await Promise.all([
      User.countDocuments({ role: ROLES.EMPLOYEE, isActive: true }),
      WorkSession.countDocuments({ status: SESSION_STATUS.ACTIVE }),
      WorkSession.countDocuments({ status: SESSION_STATUS.COMPLETED, sessionDate: { $gte: dayStart, $lte: dayEnd } }),
      StoreVisit.countDocuments({ visitDate: { $gte: dayStart, $lte: dayEnd } }),
      LocationPoint.find({ clientTimestamp: { $gte: dayStart, $lte: dayEnd } }).select('latitude longitude'),
    ]);

    const checkedIn = activeSessions;
    const absent = Math.max(totalActiveEmployees - checkedIn, 0);

    // Distance from completed sessions today
    const sessionsToday = await WorkSession.find({
      sessionDate: { $gte: dayStart, $lte: dayEnd },
    }).select('totalDistanceKm');
    const totalDistance = sessionsToday.reduce((sum, s) => sum + (s.totalDistanceKm || 0), 0);

    // Visit totals today
    const visitAgg = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: dayStart, $lte: dayEnd } } },
      { $group: { _id: null, totalQuantity: { $sum: '$totalQuantity' }, totalValue: { $sum: '$totalValue' } } },
    ]);
    const visitTotals = visitAgg[0] || { totalQuantity: 0, totalValue: 0 };

    res.json({
      success: true,
      data: {
        totalActiveEmployees,
        checkedIn,
        absent,
        activeSessions,
        completedSessions,
        totalSessions: activeSessions + completedSessions,
        visits: visits,
        totalDistanceKm: Number(totalDistance.toFixed(2)),
        totalQuantity: visitTotals.totalQuantity,
        totalValue: fromMinorUnits(visitTotals.totalValue),
        totalValueMinor: visitTotals.totalValue,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/live
 * Returns active sessions with last known location.
 */
export async function getLiveActivity(req, res, next) {
  try {
    const activeSessions = await WorkSession.find({ status: SESSION_STATUS.ACTIVE })
      .populate('employee', 'fullName email employeeId')
      .sort('-checkInAt');

    const sessionsWithLocations = await Promise.all(
      activeSessions.map(async (session) => {
        const lastPoint = await LocationPoint.findOne({ session: session._id, status: 'synced' })
          .sort('-clientTimestamp')
          .select('latitude longitude accuracy clientTimestamp');
        return {
          ...session.toObject(),
          lastLocation: lastPoint || null,
        };
      }),
    );

    res.json({ success: true, data: sessionsWithLocations });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/charts
 * Returns chart data: attendance trend, visits by date, collection by date,
 * top employees, top stores, product quantities.
 */
export async function getCharts(req, res, next) {
  try {
    const { days = 7 } = req.query;
    const numDays = Math.min(parseInt(days, 10) || 7, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setUTCHours(0, 0, 0, 0);

    // Attendance trend (sessions per day)
    const attendanceTrend = await WorkSession.aggregate([
      { $match: { sessionDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Visits by date
    const visitsByDate = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Collection (collected amounts) by date
    const collectionByDate = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          collected: { $sum: '$items.collectedAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top employees by visit count
    const topEmployees = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: startDate } } },
      {
        $group: {
          _id: '$employee',
          visitCount: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        },
      },
      { $sort: { visitCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          fullName: '$user.fullName',
          email: '$user.email',
          visitCount: 1,
          totalValue: 1,
        },
      },
    ]);

    // Top stores by visit count
    const topStores = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: startDate } } },
      {
        $group: {
          _id: '$store',
          visitCount: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        },
      },
      { $sort: { visitCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          _id: 1,
          name: '$store.name',
          code: '$store.code',
          city: '$store.city',
          visitCount: 1,
          totalValue: 1,
        },
      },
    ]);

    // Product quantities
    const productQuantities = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        attendanceTrend,
        visitsByDate,
        collectionByDate,
        topEmployees,
        topStores,
        productQuantities,
      },
    });
  } catch (err) {
    next(err);
  }
}
