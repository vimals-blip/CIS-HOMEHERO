import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.post('/', authMiddleware, asyncHandler(paymentController.create));

export default router;
