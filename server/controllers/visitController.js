import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/helpers.js';
import { distanceMeters, getPagination, paginateResult, startOfDayUTC, endOfDayUTC, toMinorUnits } from '../utils/geo.js';
import { STORE_VISIT_RADIUS_METERS, SESSION_STATUS, SYNC_STATUS } from '../config/constants.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * POST /api/v1/visits
 * Employee: create a store visit.
 * - Idempotency check via idempotencyKey
 * - Verify active session
 * - Calculate distance from store
 * - Build line items with price snapshots from Product collection
 * - Calculate totals on backend
 * - Increment session visitCount
 */
export async function createVisit(req, res, next) {
  try {
    const {
      sessionId,
      storeId,
      latitude,
      longitude,
      accuracy,
      notes,
      items,
      idempotencyKey,
      visitDate,
    } = req.body;

    if (!sessionId || !storeId || !idempotencyKey) {
      throw new AppError('sessionId, storeId, and idempotencyKey are required', 400);
    }

    // Idempotency check
    const existing = await StoreVisit.findOne({ idempotencyKey });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Visit already exists (idempotent)',
        data: existing,
      });
    }

    // Verify active session belongs to user
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

    // Verify store exists and is active
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }
    if (!store.isActive) {
      throw new AppError('Store is not active', 400);
    }

    // Calculate distance from store
    let distMeters = 0;
    let isOutside = false;
    if (latitude != null && longitude != null && store.location) {
      distMeters = distanceMeters(latitude, longitude, store.location.lat, store.location.lng);
      isOutside = distMeters > STORE_VISIT_RADIUS_METERS;
    }

    // Build line items with price snapshots from Product collection
    const builtItems = [];
    let totalQuantity = 0;
    let totalValueMinor = 0;

    if (Array.isArray(items) && items.length > 0) {
      // Fetch products for price snapshots
      const productIds = items.filter((i) => i.productId).map((i) => i.productId);
      const products = productIds.length > 0 ? await Product.find({ _id: { $in: productIds } }) : [];
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      for (const item of items) {
        let productName = item.productName || '';
        let sku = item.sku || '';
        let unitPrice = item.unitPrice || 0;

        if (item.productId) {
          const product = productMap.get(item.productId);
          if (product) {
            productName = product.name;
            sku = product.sku;
            // Use product default price if no explicit price given
            if (!item.unitPrice) {
              unitPrice = product.defaultPrice || 0;
            }
          }
        }

        const qty = Number(item.quantity) || 0;
        const unitPriceMinor = toMinorUnits(unitPrice);
        const lineTotal = unitPriceMinor * qty;
        const collected = toMinorUnits(item.collectedAmount || 0);

        builtItems.push({
          product: item.productId || undefined,
          productName,
          sku,
          quantity: qty,
          unitPrice,
          collectedAmount: item.collectedAmount || 0,
          notes: item.notes || undefined,
        });

        totalQuantity += qty;
        totalValueMinor += lineTotal;
      }
    }

    const visit = await StoreVisit.create({
      employee: req.user._id,
      session: session._id,
      store: store._id,
      visitDate: visitDate || new Date(),
      location: latitude != null && longitude != null ? { lat: latitude, lng: longitude, accuracy: accuracy || null } : undefined,
      distanceFromStoreMeters: distMeters,
      isOutsideRadius: isOutside,
      notes: notes || undefined,
      items: builtItems,
      totalQuantity,
      totalValue: totalValueMinor, // setter converts to minor units (already in minor, but setter handles it)
      idempotencyKey,
      syncStatus: SYNC_STATUS.SYNCED,
    });

    // Increment session visitCount
    session.visitCount += 1;
    await session.save();

    await logAudit({
      req,
      action: 'visit.create',
      entity: 'StoreVisit',
      entityId: visit._id,
      description: `${req.user.email} visited store ${store.name}`,
    });

    res.status(201).json({ success: true, message: 'Visit recorded', data: visit });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/visits/me
 * Employee: list own visits.
 */
export async function getMyVisits(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { startDate, endDate } = req.query;
    const filter = { employee: req.user._id };
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

/**
 * GET /api/v1/visits/:id
 */
export async function getVisit(req, res, next) {
  try {
    const visit = await StoreVisit.findById(req.params.id).populate('store', 'name code city address location');
    if (!visit) throw new AppError('Visit not found', 404);

    if (req.user.role === 'employee' && visit.employee.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to view this visit', 403);
    }

    res.json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/visits
 * Admin: list all visits.
 */
export async function listVisits(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { employee, store, startDate, endDate } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (store) filter.store = store;
    if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) filter.visitDate.$gte = startOfDayUTC(startDate);
      if (endDate) filter.visitDate.$lte = endOfDayUTC(endDate);
    }
    const [total, visits] = await Promise.all([
      StoreVisit.countDocuments(filter),
      StoreVisit.find(filter)
        .populate('store', 'name code city')
        .populate('employee', 'fullName email employeeId')
        .sort('-visitDate')
        .skip(skip)
        .limit(limit),
    ]);
    res.json({ success: true, data: paginateResult(visits, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/visits/:id/correct
 * Admin: correct a visit (requires reason).
 */
export async function correctVisit(req, res, next) {
  try {
    const { reason, notes, items, totalQuantity, totalValue } = req.body;
    if (!reason || !reason.trim()) {
      throw new AppError('Correction reason is required', 400);
    }

    const visit = await StoreVisit.findById(req.params.id);
    if (!visit) throw new AppError('Visit not found', 404);
    const before = visit.toObject();

    if (notes !== undefined) visit.notes = notes;
    if (Array.isArray(items)) visit.items = items;
    if (totalQuantity !== undefined) visit.totalQuantity = totalQuantity;
    if (totalValue !== undefined) visit.totalValue = totalValue;
    visit.corrected = true;
    visit.correctionReason = reason;
    visit.correctedBy = req.user._id;
    await visit.save();

    await logAudit({
      req,
      action: 'visit.correct',
      entity: 'StoreVisit',
      entityId: visit._id,
      description: `Visit corrected: ${reason}`,
      before,
      after: visit.toObject(),
    });

    res.json({ success: true, message: 'Visit corrected', data: visit });
  } catch (err) {
    next(err);
  }
}
