import { Router } from 'express';
import { getSummary, getLiveActivity, getCharts } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/live', getLiveActivity);
router.get('/charts', getCharts);

export default router;
