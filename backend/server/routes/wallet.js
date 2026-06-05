import { Router } from 'express';
import { walletController } from '../controllers/walletController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/:expertId',             asyncHandler(walletController.get));
router.get('/:expertId/earnings',    asyncHandler(walletController.earnings));
router.get('/:expertId/withdrawals', asyncHandler(walletController.withdrawals));
router.post('/:expertId/withdraw',   asyncHandler(walletController.withdraw));

export default router;
