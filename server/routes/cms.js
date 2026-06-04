import { Router } from 'express';
import { cmsController } from '../controllers/cmsController.js';
import { asyncHandler } from '../utils.js';

// Public CMS reads — no auth.
const router = Router();

router.get('/banners',     asyncHandler(cmsController.banners));
router.get('/pages/:slug', asyncHandler(cmsController.page));
router.get('/settings',    asyncHandler(cmsController.publicSettings));
router.get('/cities',      asyncHandler(cmsController.activeCities));

export default router;
