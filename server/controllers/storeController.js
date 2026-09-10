import Store from '../models/Store.js';
import StoreVisit from '../models/StoreVisit.js';
import { AppError } from '../utils/helpers.js';
import { getPagination, paginateResult } from '../utils/geo.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * GET /api/v1/stores
 * Admin: list stores with search/filter/pagination.
 */
export async function listStores(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, city, isActive } = req.query;

    const filter = {};
    if (city) filter.city = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, stores] = await Promise.all([
      Store.countDocuments(filter),
      Store.find(filter).sort('-createdAt').skip(skip).limit(limit),
    ]);

    res.json({ success: true, data: paginateResult(stores, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/stores/active
 * List all active stores (for employees to select from).
 */
export async function listActiveStores(req, res, next) {
  try {
    const stores = await Store.find({ isActive: true }).sort('name');
    res.json({ success: true, data: stores });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/stores/:id
 */
export async function getStore(req, res, next) {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/stores
 * Admin: create store.
 */
export async function createStore(req, res, next) {
  try {
    const { name, code, ownerName, phone, address, city, state, postalCode, lat, lng, latitude, longitude, isActive } = req.body;

    if (!name || !code) {
      throw new AppError('name and code are required', 400);
    }

    const resolvedLat = lat ?? latitude;
    const resolvedLng = lng ?? longitude;

    const store = await Store.create({
      name,
      code,
      ownerName,
      phone,
      address,
      city,
      state,
      postalCode,
      location: resolvedLat != null && resolvedLng != null ? { lat: Number(resolvedLat), lng: Number(resolvedLng) } : undefined,
      isActive: isActive ?? true,
      createdBy: req.user._id,
    });

    await logAudit({
      req,
      action: 'store.create',
      entity: 'Store',
      entityId: store._id,
      description: `Created store ${store.name} (${store.code})`,
    });

    res.status(201).json({ success: true, message: 'Store created', data: store });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/stores/:id
 */
export async function updateStore(req, res, next) {
  try {
    const { name, code, ownerName, phone, address, city, state, postalCode, lat, lng, latitude, longitude, isActive } = req.body;

    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);
    const before = store.toObject();

    if (name !== undefined) store.name = name;
    if (code !== undefined) store.code = code;
    if (ownerName !== undefined) store.ownerName = ownerName;
    if (phone !== undefined) store.phone = phone;
    if (address !== undefined) store.address = address;
    if (city !== undefined) store.city = city;
    if (state !== undefined) store.state = state;
    if (postalCode !== undefined) store.postalCode = postalCode;
    const resolvedLat = lat ?? latitude;
    const resolvedLng = lng ?? longitude;
    if (resolvedLat !== undefined && resolvedLng !== undefined) {
      store.location = { lat: Number(resolvedLat), lng: Number(resolvedLng) };
    }
    if (isActive !== undefined) store.isActive = isActive;
    await store.save();

    await logAudit({
      req,
      action: 'store.update',
      entity: 'Store',
      entityId: store._id,
      description: `Updated store ${store.name}`,
      before,
      after: store.toObject(),
    });

    res.json({ success: true, message: 'Store updated', data: store });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/stores/:id/toggle-status
 */
export async function toggleStoreStatus(req, res, next) {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);

    const before = store.isActive;
    store.isActive = !store.isActive;
    await store.save();

    await logAudit({
      req,
      action: 'store.toggleStatus',
      entity: 'Store',
      entityId: store._id,
      description: `Store ${store.name} status set to ${store.isActive}`,
      before: { isActive: before },
      after: { isActive: store.isActive },
    });

    res.json({ success: true, message: `Store ${store.isActive ? 'activated' : 'deactivated'}`, data: store });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/stores/:id
 * Prevent deletion if the store has visits.
 */
export async function deleteStore(req, res, next) {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);

    const visitCount = await StoreVisit.countDocuments({ store: store._id });
    if (visitCount > 0) {
      throw new AppError(`Cannot delete store with ${visitCount} visit(s). Deactivate instead.`, 409);
    }

    const before = store.toObject();
    await store.deleteOne();

    await logAudit({
      req,
      action: 'store.delete',
      entity: 'Store',
      entityId: store._id,
      description: `Deleted store ${store.name}`,
      before,
    });

    res.json({ success: true, message: 'Store deleted' });
  } catch (err) {
    next(err);
  }
}
