import User from '../models/User.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import LocationPoint from '../models/LocationPoint.js';
import { ROLES, SESSION_STATUS } from '../config/constants.js';
import { startOfDayUTC, endOfDayUTC, fromMinorUnits } from '../utils/geo.js';

function resolveRange(query) {
  const { date, startDate, endDate, days = 7 } = query;

  if (startDate || endDate) {
    const start = startDate ? startOfDayUTC(new Date(startDate)) : startOfDayUTC(new Date(Date.now() - 7 * 86400000));
    const end = endDate ? endOfDayUTC(new Date(endDate)) : endOfDayUTC(new Date());
    return { start, end };
  }

  if (date) {
    const target = new Date(date);
    return { start: startOfDayUTC(target), end: endOfDayUTC(target) };
  }

  const numDays = Math.min(parseInt(days, 10) || 7, 90);
  const start = new Date();
  start.setDate(start.getDate() - numDays);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end: endOfDayUTC(new Date()) };
}

/**
 * GET /api/v1/dashboard/summary
 */
export async function getSummary(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);
    const hasExplicitRange = Boolean(req.query.startDate || req.query.endDate || req.query.date);
    const dayStart = hasExplicitRange ? start : startOfDayUTC(new Date());
    const dayEnd = hasExplicitRange ? end : endOfDayUTC(new Date());

    const [
      totalActiveEmployees,
      totalStores,
      totalProducts,
      activeSessions,
      completedSessions,
      visits,
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.EMPLOYEE, isActive: true }),
      Store.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      WorkSession.countDocuments({ status: SESSION_STATUS.ACTIVE }),
      WorkSession.countDocuments({
        status: SESSION_STATUS.COMPLETED,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
      }),
      StoreVisit.countDocuments({ visitDate: { $gte: dayStart, $lte: dayEnd } }),
    ]);

    const checkedIn = activeSessions;
    const absent = Math.max(totalActiveEmployees - checkedIn, 0);

    const sessionsInRange = await WorkSession.find({
      sessionDate: { $gte: dayStart, $lte: dayEnd },
    }).select('totalDistanceKm');
    const totalDistance = sessionsInRange.reduce((sum, s) => sum + (s.totalDistanceKm || 0), 0);

    const visitAgg = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: dayStart, $lte: dayEnd } } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$totalQuantity' },
          totalValue: { $sum: '$totalValue' },
        },
      },
    ]);
    const visitTotals = visitAgg[0] || { totalQuantity: 0, totalValue: 0 };
    const totalValue = fromMinorUnits(visitTotals.totalValue);
    const avgVisitValue = visits > 0 ? totalValue / visits : 0;

    res.json({
      success: true,
      data: {
        totalEmployees: totalActiveEmployees,
        activeToday: checkedIn,
        totalStores,
        totalProducts,
        todayVisits: visits,
        activeSessions,
        totalRevenue: totalValue,
        avgVisitValue,
        totalActiveEmployees,
        checkedIn,
        absent,
        completedSessions,
        totalSessions: activeSessions + completedSessions,
        visits,
        totalDistanceKm: Number(totalDistance.toFixed(2)),
        totalQuantity: visitTotals.totalQuantity,
        totalValue,
        totalValueMinor: visitTotals.totalValue,
        rangeStart: dayStart,
        rangeEnd: dayEnd,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/live
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
 * GET /api/v1/dashboard/attendance-chart
 */
export async function getAttendanceChart(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);

    const rows = await WorkSession.aggregate([
      { $match: { sessionDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' } },
          checkIns: { $sum: 1 },
          checkOuts: {
            $sum: {
              $cond: [{ $eq: ['$status', SESSION_STATUS.COMPLETED] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          checkIns: 1,
          checkOuts: 1,
        },
      },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/visits-chart
 */
export async function getVisitsChart(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);

    const rows = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          visits: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          visits: 1,
        },
      },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/top-employees
 */
export async function getTopEmployees(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);

    const rows = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$employee',
          visits: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        },
      },
      { $sort: { visits: -1 } },
      { $limit: 10 },
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
          _id: 0,
          name: '$user.fullName',
          visits: 1,
          totalValue: 1,
        },
      },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/product-chart
 */
export async function getProductChart(req, res, next) {
  try {
    const { start, end } = resolveRange(req.query);

    const rows = await StoreVisit.aggregate([
      { $match: { visitDate: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          value: { $sum: '$items.quantity' },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
        },
      },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/recent-activity
 */
export async function getRecentActivity(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const [sessions, visits] = await Promise.all([
      WorkSession.find({})
        .populate('employee', 'fullName')
        .sort('-checkInAt')
        .limit(limit)
        .select('status checkInAt checkOutAt employee'),
      StoreVisit.find({})
        .populate('employee', 'fullName')
        .populate('store', 'name')
        .sort('-visitDate')
        .limit(limit)
        .select('visitDate employee store totalQuantity'),
    ]);

    const activity = [
      ...sessions.flatMap((s) => {
        const items = [
          {
            type: 'check_in',
            description: 'Checked in',
            employeeName: s.employee?.fullName || '—',
            timestamp: s.checkInAt,
          },
        ];
        if (s.checkOutAt) {
          items.push({
            type: 'check_out',
            description: 'Checked out',
            employeeName: s.employee?.fullName || '—',
            timestamp: s.checkOutAt,
          });
        }
        return items;
      }),
      ...visits.map((v) => ({
        type: 'store_visit',
        description: `Visited ${v.store?.name || 'store'}${v.totalQuantity ? ` (${v.totalQuantity} items)` : ''}`,
        employeeName: v.employee?.fullName || '—',
        timestamp: v.visitDate,
      })),
    ]
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/charts
 * Combined chart payload (legacy / admin tools).
 */
export async function getCharts(req, res, next) {
  try {
    const { start } = resolveRange(req.query);

    const [attendanceTrend, visitsByDate, collectionByDate, topEmployees, topStores, productQuantities] =
      await Promise.all([
        WorkSession.aggregate([
          { $match: { sessionDate: { $gte: start } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        StoreVisit.aggregate([
          { $match: { visitDate: { $gte: start } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
              count: { $sum: 1 },
              totalValue: { $sum: '$totalValue' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        StoreVisit.aggregate([
          { $match: { visitDate: { $gte: start } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
              collected: { $sum: '$items.collectedAmount' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        StoreVisit.aggregate([
          { $match: { visitDate: { $gte: start } } },
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
        ]),
        StoreVisit.aggregate([
          { $match: { visitDate: { $gte: start } } },
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
        ]),
        StoreVisit.aggregate([
          { $match: { visitDate: { $gte: start } } },
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
        ]),
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
