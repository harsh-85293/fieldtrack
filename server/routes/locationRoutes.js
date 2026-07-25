import { Router } from 'express';
import { submitLocations, getMyLocations } from '../controllers/locationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.post('/', submitLocations);
router.get('/me', getMyLocations);

export default router;
