import { Router } from 'express';
import { reviewController } from '../controllers/reviewController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.get('/',  asyncHandler(reviewController.list));
router.post('/', authMiddleware, asyncHandler(reviewController.create));

export default router;
