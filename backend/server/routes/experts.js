import { Router } from 'express';
import { expertController } from '../controllers/expertController.js';
import { documentController } from '../controllers/documentController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// Public
router.get('/',    asyncHandler(expertController.list));
router.get('/:id', asyncHandler(expertController.getOne));

// Expert (self) or admin
router.patch('/:id/status',     authMiddleware, asyncHandler(expertController.setStatus));
router.patch('/:id/location',   authMiddleware, asyncHandler(expertController.setLocation));
router.patch('/:id/profile',    authMiddleware, asyncHandler(expertController.updateProfile));

// KYC documents (self or admin)
router.get('/:id/upload-target', authMiddleware, asyncHandler(documentController.uploadTarget));
router.get('/:id/documents',     authMiddleware, asyncHandler(documentController.list));
router.post('/:id/documents',    authMiddleware, asyncHandler(documentController.submit));

// Admin only — verify / approve
router.patch('/:id', authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(expertController.setVerified));

export default router;
