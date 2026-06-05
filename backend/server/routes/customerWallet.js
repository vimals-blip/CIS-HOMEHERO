import { Router } from 'express';
import { walletController } from '../controllers/walletController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/',       asyncHandler(walletController.getMine));
router.post('/topup', asyncHandler(walletController.topUp));

export default router;
