import { Router } from 'express';
import { body } from 'express-validator';
import {
  listProducts,
  listActiveProducts,
  getProduct,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

router.use(protect);

router.get('/', listProducts);
router.get('/active', listActiveProducts);
router.get('/:id', getProduct);

router.post(
  '/',
  adminOnly,
  [body('name').notEmpty().withMessage('Name is required'), body('sku').notEmpty().withMessage('SKU is required')],
  handleValidation,
  createProduct,
);
router.put('/:id', adminOnly, updateProduct);
router.patch('/:id/toggle-status', adminOnly, toggleProductStatus);
router.delete('/:id', adminOnly, deleteProduct);

export default router;
