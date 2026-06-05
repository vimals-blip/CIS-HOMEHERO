import { Router } from 'express';
import { serviceController } from '../controllers/serviceController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// Public
router.get('/',    asyncHandler(serviceController.list));
router.get('/:id', asyncHandler(serviceController.getOne));

// Admin
router.post('/',      authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(serviceController.create));
router.patch('/:id',  authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(serviceController.update));

export default router;
