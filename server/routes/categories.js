import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.get('/',     asyncHandler(categoryController.getAll));
router.get('/:id',  asyncHandler(categoryController.getOne));
router.post('/',    authMiddleware, requireRole('ADMIN'), asyncHandler(categoryController.create));
router.patch('/:id', authMiddleware, requireRole('ADMIN'), asyncHandler(categoryController.toggle));

export default router;
