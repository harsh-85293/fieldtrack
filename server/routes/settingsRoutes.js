import { Router } from 'express';
import { listSettings, getPublicSettings, updateSetting } from '../controllers/settingsController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

// Public settings — no auth required
router.get('/public', getPublicSettings);

// Admin routes
router.get('/', protect, adminOnly, listSettings);
router.put('/:key', protect, adminOnly, updateSetting);

export default router;
