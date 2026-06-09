import { Router } from 'express';
import { serviceController } from '../controllers/serviceController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// Public — cached (admin writes bust the cache in the controller).
router.get('/',    cacheMiddleware(120), asyncHandler(serviceController.list));
router.get('/:id', cacheMiddleware(120), asyncHandler(serviceController.getOne));

// Admin
router.post('/',      authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(serviceController.create));
router.patch('/:id',  authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(serviceController.update));
router.delete('/:id', authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(serviceController.delete));

export default router;
