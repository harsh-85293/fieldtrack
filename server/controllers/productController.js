import Product from '../models/Product.js';
import StoreVisit from '../models/StoreVisit.js';
import { AppError } from '../utils/helpers.js';
import { getPagination, paginateResult } from '../utils/geo.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * GET /api/v1/products
 * Admin: list products with search/filter/pagination.
 */
export async function listProducts(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort('-createdAt').skip(skip).limit(limit),
    ]);

    res.json({ success: true, data: paginateResult(products, total, page, limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/products/active
 * List all active products (for employees).
 */
export async function listActiveProducts(req, res, next) {
  try {
    const products = await Product.find({ isActive: true }).sort('name');
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/products/:id
 */
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/products
 * Admin: create product.
 */
export async function createProduct(req, res, next) {
  try {
    const { name, sku, description, unit, defaultPrice, isActive } = req.body;

    if (!name || !sku) {
      throw new AppError('name and sku are required', 400);
    }

    const product = await Product.create({
      name,
      sku,
      description,
      unit: unit || 'pc',
      defaultPrice: defaultPrice ?? 0,
      isActive: isActive ?? true,
      createdBy: req.user._id,
    });

    await logAudit({
      req,
      action: 'product.create',
      entity: 'Product',
      entityId: product._id,
      description: `Created product ${product.name} (${product.sku})`,
    });

    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/products/:id
 */
export async function updateProduct(req, res, next) {
  try {
    const { name, sku, description, unit, defaultPrice, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);
    const before = product.toObject();

    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku;
    if (description !== undefined) product.description = description;
    if (unit !== undefined) product.unit = unit;
    if (defaultPrice !== undefined) product.defaultPrice = defaultPrice;
    if (isActive !== undefined) product.isActive = isActive;
    await product.save();

    await logAudit({
      req,
      action: 'product.update',
      entity: 'Product',
      entityId: product._id,
      description: `Updated product ${product.name}`,
      before,
      after: product.toObject(),
    });

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/products/:id/toggle-status
 */
export async function toggleProductStatus(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const before = product.isActive;
    product.isActive = !product.isActive;
    await product.save();

    await logAudit({
      req,
      action: 'product.toggleStatus',
      entity: 'Product',
      entityId: product._id,
      description: `Product ${product.name} status set to ${product.isActive}`,
      before: { isActive: before },
      after: { isActive: product.isActive },
    });

    res.json({ success: true, message: `Product ${product.isActive ? 'activated' : 'deactivated'}`, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/products/:id
 * Prevent deletion if product is referenced in visits.
 */
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const visitCount = await StoreVisit.countDocuments({ 'items.product': product._id });
    if (visitCount > 0) {
      throw new AppError(`Cannot delete product referenced in ${visitCount} visit(s). Deactivate instead.`, 409);
    }

    const before = product.toObject();
    await product.deleteOne();

    await logAudit({
      req,
      action: 'product.delete',
      entity: 'Product',
      entityId: product._id,
      description: `Deleted product ${product.name}`,
      before,
    });

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}
