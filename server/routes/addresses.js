import { Router } from 'express';
import { addressController } from '../controllers/addressController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.get('/',              asyncHandler(addressController.list));
router.post('/',             asyncHandler(addressController.create));
router.patch('/:id/default', asyncHandler(addressController.setDefault));
router.delete('/:id',        asyncHandler(addressController.remove));

export default router;
