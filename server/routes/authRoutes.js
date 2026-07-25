import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe, changePassword, adminCreateUser } from '../controllers/authController.js';
import { googleAuth, completeGoogleProfile } from '../controllers/googleAuthController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { handleValidation } from '../utils/helpers.js';

const router = Router();

// Stricter rate limit for Google auth endpoint
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many Google authentication attempts. Please try again later.',
  },
});

router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Identifier is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  login,
);

router.post('/google', googleLimiter, googleAuth);
router.post(
  '/google/complete-profile',
  googleLimiter,
  [
    body('providerId').notEmpty().withMessage('Provider ID is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
  ],
  handleValidation,
  completeGoogleProfile,
);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  handleValidation,
  changePassword,
);

router.post(
  '/admin/create-user',
  protect,
  adminOnly,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
  ],
  handleValidation,
  adminCreateUser,
);

export default router;
