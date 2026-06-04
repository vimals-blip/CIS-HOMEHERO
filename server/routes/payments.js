import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.post('/order',  asyncHandler(paymentController.createOrder));
router.post('/verify', asyncHandler(paymentController.verify));

export default router;
