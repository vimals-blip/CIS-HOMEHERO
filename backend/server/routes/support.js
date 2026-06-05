import { Router } from 'express';
import { supportController } from '../controllers/supportController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.use(authMiddleware);

router.post('/tickets',               asyncHandler(supportController.create));
router.get('/tickets',                asyncHandler(supportController.list));
router.get('/tickets/:id',            asyncHandler(supportController.getOne));
router.post('/tickets/:id/messages',  asyncHandler(supportController.reply));
router.patch('/tickets/:id/status',   asyncHandler(supportController.setStatus));

export default router;
