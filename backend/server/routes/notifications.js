import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/',              asyncHandler(notificationController.list));
router.patch('/:id/read',    asyncHandler(notificationController.markRead));
router.post('/read-all',     asyncHandler(notificationController.markAllRead));
router.post('/device-token', asyncHandler(notificationController.registerDevice));

export default router;
