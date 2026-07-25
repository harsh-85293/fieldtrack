import { Router } from 'express';
import { body } from 'express-validator';
import {
  listStores,
  listActiveStores,
  getStore,
  createStore,
  updateStore,
  toggleStoreStatus,
  deleteStore,
} from '../controllers/storeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

router.use(protect);

router.get('/', listStores);
router.get('/active', listActiveStores);
router.get('/:id', getStore);

router.post(
  '/',
  adminOnly,
  [body('name').notEmpty().withMessage('Name is required'), body('code').notEmpty().withMessage('Code is required')],
  handleValidation,
  createStore,
);
router.put('/:id', adminOnly, updateStore);
router.patch('/:id/toggle-status', adminOnly, toggleStoreStatus);
router.delete('/:id', adminOnly, deleteStore);

export default router;
