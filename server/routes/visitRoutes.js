import { Router } from 'express';
import { body } from 'express-validator';
import { createVisit, getMyVisits, getVisit, listVisits, correctVisit } from '../controllers/visitController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

router.use(protect);

router.post(
  '/',
  [
    body('sessionId').notEmpty().withMessage('sessionId is required'),
    body('storeId').notEmpty().withMessage('storeId is required'),
    body('idempotencyKey').notEmpty().withMessage('idempotencyKey is required'),
  ],
  handleValidation,
  createVisit,
);
router.get('/me', getMyVisits);
router.get('/my', getMyVisits); // alias
router.get('/', adminOnly, listVisits);
router.get('/:id', getVisit);
router.put('/:id/correct', adminOnly, [body('reason').notEmpty().withMessage('Reason is required')], handleValidation, correctVisit);

export default router;
