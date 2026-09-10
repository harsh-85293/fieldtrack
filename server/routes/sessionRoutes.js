import { Router } from 'express';
import { body } from 'express-validator';
import {
  checkIn,
  checkOut,
  getMyActiveSession,
  getMySessions,
  getSession,
  getSessionRoute,
  listSessions,
  correctSession,
} from '../controllers/sessionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

router.use(protect);

router.post(
  '/check-in',
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  handleValidation,
  checkIn,
);

router.post('/check-out', checkOut);
router.get('/me/active', getMyActiveSession);
router.get('/me', getMySessions);
router.get('/my', getMySessions); // alias
router.get('/my/active', getMyActiveSession); // alias
router.get('/', adminOnly, listSessions);
router.get('/:id/route', getSessionRoute);
router.get('/:id', getSession);
router.put('/:id/correct', adminOnly, [body('reason').notEmpty().withMessage('Reason is required')], handleValidation, correctSession);

export default router;
