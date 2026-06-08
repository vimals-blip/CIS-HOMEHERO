import { Router } from 'express';
import { cmsController } from '../controllers/cmsController.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../utils.js';

// Public CMS reads — no auth. Cached (admin edits appear within the TTL window).
const router = Router();

router.use(cacheMiddleware(120));

router.get('/banners',     asyncHandler(cmsController.banners));
router.get('/pages/:slug', asyncHandler(cmsController.page));
router.get('/settings',    asyncHandler(cmsController.publicSettings));
router.get('/cities',      asyncHandler(cmsController.activeCities));

export default router;
