import { Router } from 'express';
import { body } from 'express-validator';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetPassword,
  getMyProfile,
  updateMyProfile,
  getMyAttendance,
  getEmployeeAttendance,
  getEmployeeVisits,
  getEmployeeSummary,
} from '../controllers/employeeController.js';
import {
  listPendingEmployees,
  approveEmployee,
  rejectEmployee,
  suspendEmployee,
  reactivateEmployee,
} from '../controllers/approvalController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

router.use(protect);

// Self routes (must come before /:id to avoid conflict)
router.get('/me/profile', getMyProfile);
router.put('/me/profile', updateMyProfile);
router.get('/me/attendance', getMyAttendance);

// Pending approvals (admin)
router.get('/pending', adminOnly, listPendingEmployees);
router.patch('/:id/approve', adminOnly, approveEmployee);
router.patch(
  '/:id/reject',
  adminOnly,
  [body('reason').notEmpty().withMessage('A rejection reason is required')],
  handleValidation,
  rejectEmployee,
);
router.patch('/:id/suspend', adminOnly, suspendEmployee);
router.patch('/:id/reactivate', adminOnly, reactivateEmployee);

// Admin routes
router.get('/', adminOnly, listEmployees);
router.get('/:id', adminOnly, getEmployee);
router.get('/:id/summary', adminOnly, getEmployeeSummary);
router.post(
  '/',
  adminOnly,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
  ],
  handleValidation,
  createEmployee,
);
router.put('/:id', adminOnly, updateEmployee);
router.patch('/:id/toggle-status', adminOnly, toggleEmployeeStatus);
router.put('/:id/reset-password', adminOnly, resetPassword);
router.get('/:id/attendance', adminOnly, getEmployeeAttendance);
router.get('/:id/visits', adminOnly, getEmployeeVisits);

export default router;
