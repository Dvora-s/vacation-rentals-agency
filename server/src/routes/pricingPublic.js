import { Router } from 'express';
import * as pricingPublicController from '../controllers/pricingPublicController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/catalog', asyncHandler(pricingPublicController.getCatalog));
router.get('/checkout-plans', asyncHandler(pricingPublicController.getCheckoutPlans));
router.get('/quote', asyncHandler(pricingPublicController.getQuote));

export default router;
