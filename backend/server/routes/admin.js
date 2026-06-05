import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { documentController } from '../controllers/documentController.js';
import { cmsController } from '../controllers/cmsController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// Operational admin: ADMIN or SUPER_ADMIN
router.use(authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'));

// Platform configuration & admin management are SUPER_ADMIN-only.
const superAdmin = requireRole('SUPER_ADMIN');

// ── Operations (ADMIN + SUPER_ADMIN) ───────────────────────────────────────
router.get('/overview',      asyncHandler(adminController.getOverview));
router.get('/experts',       asyncHandler(adminController.getExperts));
router.get('/users',          asyncHandler(adminController.getUsers));
router.get('/users/:userId',  asyncHandler(adminController.getUserDetail));
router.patch('/users/:userId', asyncHandler(adminController.updateUser));
router.post('/users/:userId/reset-password', asyncHandler(adminController.resetPassword));
// Hard delete is destructive → super-admin only.
router.delete('/users/:userId', superAdmin, asyncHandler(adminController.deleteUser));
// Audit trail — super-admin only.
router.get('/audit-logs', superAdmin, asyncHandler(adminController.getAuditLogs));
router.get('/bookings',      asyncHandler(adminController.getBookings));
router.post('/coupons',      asyncHandler(adminController.createCoupon));
router.patch('/coupons/:id', asyncHandler(adminController.toggleCoupon));
router.get('/withdrawals',      asyncHandler(adminController.getWithdrawals));
router.patch('/withdrawals/:id', asyncHandler(adminController.actOnWithdrawal));
router.patch('/experts/:id/documents/:docId', asyncHandler(documentController.review));

// ── Platform config & CMS (SUPER_ADMIN only) ───────────────────────────────
router.get('/banners',       superAdmin, asyncHandler(cmsController.allBanners));
router.post('/banners',      superAdmin, asyncHandler(cmsController.createBanner));
router.patch('/banners/:id', superAdmin, asyncHandler(cmsController.toggleBanner));
router.put('/pages/:slug',   superAdmin, asyncHandler(cmsController.savePage));
router.get('/settings',      superAdmin, asyncHandler(cmsController.allSettings));
router.post('/settings',     superAdmin, asyncHandler(cmsController.saveSetting));
router.get('/cities',        superAdmin, asyncHandler(cmsController.allCities));
router.post('/cities',       superAdmin, asyncHandler(cmsController.createCity));
router.patch('/cities/:id',  superAdmin, asyncHandler(cmsController.toggleCity));

// ── Admin management (SUPER_ADMIN only) ─────────────────────────────────────
router.get('/admins',  superAdmin, asyncHandler(adminController.listAdmins));
router.post('/admins', superAdmin, asyncHandler(adminController.promoteAdmin));

export default router;
