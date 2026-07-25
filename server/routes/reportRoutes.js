import { Router } from 'express';
import { employeeReport, storeReport, productReport, dateReport, exportCsv, exportExcel, exportPdf } from '../controllers/reportController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/employee', employeeReport);
router.get('/store', storeReport);
router.get('/product', productReport);
router.get('/date', dateReport);
router.get('/export/:type/csv', exportCsv);
router.get('/export/:type/excel', exportExcel);
router.get('/export/:type/pdf', exportPdf);

export default router;
