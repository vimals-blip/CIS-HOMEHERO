import { Router } from 'express';
import { couponController } from '../controllers/couponController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.post('/validate', authMiddleware, asyncHandler(couponController.validate));

export default router;
