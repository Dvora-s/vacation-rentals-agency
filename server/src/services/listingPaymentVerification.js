import { paypalGetCapture } from './paypalRest.js';
import { verifyPayment as paymeVerifyPayment } from './paymeService.js';
import {
  selectPaymentById,
  selectPaymentByPaymeTransactionId,
} from '../models/paymentModel.js';
import { selectListingPaymentByProviderReference } from '../models/listingPaymentModel.js';

const ALLOWED_PROVIDERS = new Set(['paypal', 'payme']);

function amountsMatch(expected, actual) {
  return Math.abs(Number(expected) - Number(actual)) < 0.02;
}

async function verifyPayPalCapture({ providerReference, expectedAmount, currency = 'ILS' }) {
  const capture = await paypalGetCapture(providerReference);
  if (String(capture?.status || '').toUpperCase() !== 'COMPLETED') {
    throw new Error('תשלום PayPal לא הושלם');
  }
  const value = capture?.amount?.value;
  const code = String(capture?.amount?.currency_code || '').toUpperCase();
  if (!amountsMatch(expectedAmount, value)) {
    throw new Error('סכום תשלום PayPal אינו תואם למסלול שנבחר');
  }
  if (code && code !== String(currency).toUpperCase()) {
    throw new Error('מטבע תשלום PayPal אינו תואם');
  }
  return true;
}

async function verifyPayMePayment({ userId, providerReference, expectedAmount }) {
  let row = null;
  const ref = String(providerReference || '').trim();

  if (ref.startsWith('payme:')) {
    const paymentId = Number(ref.slice(6));
    if (Number.isFinite(paymentId) && paymentId > 0) {
      row = await selectPaymentById(paymentId);
    }
  } else {
    row = await selectPaymentByPaymeTransactionId(ref);
    if (!row && ref) {
      try {
        const remote = await paymeVerifyPayment(ref);
        const remoteStatus = String(
          remote?.status || remote?.payment_status || remote?.state || '',
        ).toLowerCase();
        if (remoteStatus.includes('paid') || remoteStatus.includes('complete') || remoteStatus === 'success') {
          row = await selectPaymentByPaymeTransactionId(ref);
        }
      } catch {
        /* fall through */
      }
    }
  }

  if (!row) {
    throw new Error('לא נמצא תשלום PayMe מאושר');
  }
  if (row.user_id !== userId) {
    throw new Error('תשלום PayMe אינו שייך למשתמש הנוכחי');
  }
  if (row.status !== 'paid') {
    throw new Error('תשלום PayMe עדיין לא אושר');
  }
  if (!amountsMatch(expectedAmount, row.amount)) {
    throw new Error('סכום תשלום PayMe אינו תואם למסלול שנבחר');
  }
  return true;
}

/**
 * מאמת שתשלום בוצע דרך PayPal או PayMe לפני פרסום המודעה.
 */
export async function verifyListingPaymentProvider({
  userId,
  provider,
  providerReference,
  expectedAmount,
  currency = 'ILS',
}) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const reference = String(providerReference || '').trim();

  if (!ALLOWED_PROVIDERS.has(normalizedProvider)) {
    throw new Error('ניתן לפרסם מודעה רק לאחר תשלום דרך PayPal או PayMe');
  }
  if (!reference) {
    throw new Error('חסרה אסמכתא תשלום מהספק');
  }

  const used = await selectListingPaymentByProviderReference(normalizedProvider, reference);
  if (used) {
    throw new Error('אסמכתת תשלום זו כבר נוצלה לפרסום מודעה');
  }

  if (normalizedProvider === 'paypal') {
    return verifyPayPalCapture({ providerReference: reference, expectedAmount, currency });
  }
  return verifyPayMePayment({ userId, providerReference: reference, expectedAmount });
}
