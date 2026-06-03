import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.post('/signup', asyncHandler(authController.signup));
router.post('/login',  asyncHandler(authController.login));

export default router;
