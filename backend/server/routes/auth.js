import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.post('/signup',      authLimiter, asyncHandler(authController.signup));
router.post('/login',       authLimiter, asyncHandler(authController.login));
router.post('/otp/request', otpLimiter,  asyncHandler(authController.requestOtp));
router.post('/otp/verify',  authLimiter, asyncHandler(authController.verifyOtp));
router.post('/refresh',     asyncHandler(authController.refresh));
router.post('/logout',      asyncHandler(authController.logout));

export default router;
