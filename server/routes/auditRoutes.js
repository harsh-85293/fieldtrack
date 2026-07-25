import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/', listAuditLogs);

export default router;
