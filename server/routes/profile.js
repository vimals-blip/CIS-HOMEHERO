import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/',           asyncHandler(profileController.getMe));
router.patch('/',         asyncHandler(profileController.updateMe));
router.patch('/password', asyncHandler(profileController.changePassword));

export default router;
