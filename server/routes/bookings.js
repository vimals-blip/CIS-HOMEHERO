import { Router } from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.get('/',     authMiddleware, asyncHandler(bookingController.list));
router.post('/',    authMiddleware, asyncHandler(bookingController.create));
router.patch('/:id', authMiddleware, asyncHandler(bookingController.updateStatus));

export default router;
