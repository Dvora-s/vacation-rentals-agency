import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as paypalOrdersController from '../controllers/paypalOrdersController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.post('/', asyncHandler(paypalOrdersController.createOrder));
router.post('/:orderID/capture', asyncHandler(paypalOrdersController.captureOrder));

export default router;
