import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.post('/signup',      asyncHandler(authController.signup));
router.post('/login',       asyncHandler(authController.login));
router.post('/otp/request', asyncHandler(authController.requestOtp));
router.post('/otp/verify',  asyncHandler(authController.verifyOtp));
router.post('/refresh',     asyncHandler(authController.refresh));
router.post('/logout',      asyncHandler(authController.logout));

export default router;
