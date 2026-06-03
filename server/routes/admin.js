import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// All admin routes require ADMIN role
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/overview',          asyncHandler(adminController.getOverview));
router.get('/providers',         asyncHandler(adminController.getProviders));
router.get('/users',             asyncHandler(adminController.getUsers));
router.get('/users/:userId',     asyncHandler(adminController.getUserDetail));
router.get('/bookings',          asyncHandler(adminController.getBookings));
router.post('/coupons',          asyncHandler(adminController.createCoupon));
router.patch('/coupons/:id',     asyncHandler(adminController.toggleCoupon));

export default router;
