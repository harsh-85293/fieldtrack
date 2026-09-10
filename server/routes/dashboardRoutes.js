import { Router } from 'express';
import {
  getSummary,
  getLiveActivity,
  getCharts,
  getAttendanceChart,
  getVisitsChart,
  getTopEmployees,
  getProductChart,
  getRecentActivity,
} from '../controllers/dashboardController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/summary', getSummary);
router.get('/live', getLiveActivity);
router.get('/charts', getCharts);
router.get('/attendance-chart', getAttendanceChart);
router.get('/visits-chart', getVisitsChart);
router.get('/top-employees', getTopEmployees);
router.get('/product-chart', getProductChart);
router.get('/recent-activity', getRecentActivity);

export default router;
