import { Router } from 'express';
import { providerController } from '../controllers/providerController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// Public
router.get('/',    asyncHandler(providerController.list));
router.get('/:id', asyncHandler(providerController.getOne));

// Admin only
router.patch('/:id', authMiddleware, requireRole('ADMIN'), asyncHandler(providerController.setVerified));

// Provider or Admin
router.patch('/:id/status',                     authMiddleware, asyncHandler(providerController.setStatus));
router.put('/:id/profile',                      authMiddleware, asyncHandler(providerController.updateProfile));
router.post('/:id/categories',                  authMiddleware, asyncHandler(providerController.addCategory));
router.put('/:id/categories/:categoryId',       authMiddleware, asyncHandler(providerController.updateCategory));
router.delete('/:id/categories/:categoryId',    authMiddleware, asyncHandler(providerController.removeCategory));
router.get('/:id/documents',                    authMiddleware, asyncHandler(providerController.getDocuments));
router.post('/:id/documents',                   authMiddleware, asyncHandler(providerController.addDocument));
router.patch('/:id/documents/:docId',           authMiddleware, requireRole('ADMIN'), asyncHandler(providerController.updateDocument));
router.delete('/:id/documents/:docId',          authMiddleware, asyncHandler(providerController.deleteDocument));

export default router;
