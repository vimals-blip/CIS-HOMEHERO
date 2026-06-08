import { Router } from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/',             asyncHandler(bookingController.list));
router.post('/',            asyncHandler(bookingController.create));
router.get('/:id',          asyncHandler(bookingController.getOne));
router.get('/:id/invoice',  asyncHandler(bookingController.getInvoice));
router.patch('/:id/status', asyncHandler(bookingController.updateStatus));
router.post('/:id/reject',  asyncHandler(bookingController.reject));
router.post('/:id/cancel',  asyncHandler(bookingController.cancel));

export default router;
