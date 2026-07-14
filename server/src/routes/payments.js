import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { paymeCreateLimiter } from '../middlewares/rateLimit.js';
import { validatePayMeCreateBody } from '../middlewares/validatePayMeCreate.js';
import {
  createPayMePayment,
  createPayMeSession,
  getPayMePaymentStatus,
} from '../controllers/paymentController.js';
import * as listingPayments from '../controllers/listingPaymentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/** iFrame / Hosted Fields — Generate Payment session */
router.post(
  '/create-session',
  requireAuth,
  paymeCreateLimiter,
  validatePayMeCreateBody,
  asyncHandler(createPayMeSession),
);

/** Backward-compatible alias */
router.post(
  '/create',
  requireAuth,
  paymeCreateLimiter,
  validatePayMeCreateBody,
  asyncHandler(createPayMePayment),
);

/** PayMe IPN (notify_url) — registered in index.js with urlencoded parser before express.json() */

router.post('/', requireAuth, asyncHandler(listingPayments.createListingPayment));
router.get('/available-slots', requireAuth, asyncHandler(listingPayments.listAvailableSlots));
router.get('/mine', requireAuth, asyncHandler(listingPayments.listMineListingPayments));
router.get('/', requireAuth, requireRole('admin'), asyncHandler(listingPayments.listAllListingPaymentsAdmin));
router.get('/fee', listingPayments.getListingFee);

function skipUnlessNumericPaymentId(req, res, next) {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return next('route');
  }
  next();
}

router.get('/:id/status', requireAuth, skipUnlessNumericPaymentId, asyncHandler(getPayMePaymentStatus));

export default router;
