import {
  markListingPaymentCaptured,
  markListingPaymentVoided,
  selectLatestListingPaymentForApartment,
} from '../models/listingPaymentModel.js';
import {
  paypalCaptureAuthorization,
  paypalGetAuthorization,
  paypalVoidAuthorization,
} from './paypalRest.js';

function extractPayPalAuthorizationId(providerReference) {
  const ref = String(providerReference || '').trim();
  if (!ref) return null;
  if (ref.startsWith('auth:')) return ref.slice(5);
  return ref;
}

/**
 * חיוב בפועל בעת אישור מנהל (PayPal: capture authorization).
 */
export async function captureListingPaymentOnApprove(apartmentId) {
  const payment = await selectLatestListingPaymentForApartment(apartmentId, ['authorized', 'paid']);
  if (!payment) {
    const err = new Error('לא נמצא תשלום לדירה זו');
    err.statusCode = 400;
    throw err;
  }
  if (payment.status === 'paid') {
    return payment;
  }

  if (payment.provider === 'paypal') {
    const authId = extractPayPalAuthorizationId(payment.provider_reference);
    if (!authId) {
      const err = new Error('חסרה אסמכתא אישור תשלום PayPal');
      err.statusCode = 400;
      throw err;
    }
    const auth = await paypalGetAuthorization(authId);
    const authStatus = String(auth?.status || '').toUpperCase();
    if (!['CREATED', 'CAPTURED', 'PARTIALLY_CAPTURED', 'PENDING'].includes(authStatus)) {
      const err = new Error(`אישור התשלום ב־PayPal אינו בתוקף (${authStatus || 'לא ידוע'})`);
      err.statusCode = 409;
      throw err;
    }
    if (authStatus === 'CAPTURED') {
      await markListingPaymentCaptured(payment.id, payment.provider_reference);
      return payment;
    }
    const capture = await paypalCaptureAuthorization(authId);
    const captureId = capture?.id || `capture:${authId}`;
    await markListingPaymentCaptured(payment.id, captureId);
    return { ...payment, status: 'paid', provider_reference: captureId };
  }

  await markListingPaymentCaptured(payment.id, payment.provider_reference);
  return { ...payment, status: 'paid' };
}

/** ביטול אישור תשלום מושהה (דחייה לפני אישור). */
export async function releaseListingPaymentOnReject(apartmentId) {
  const payment = await selectLatestListingPaymentForApartment(apartmentId, ['authorized']);
  if (!payment) return;

  if (payment.provider === 'paypal') {
    const authId = extractPayPalAuthorizationId(payment.provider_reference);
    if (authId) {
      try {
        await paypalVoidAuthorization(authId);
      } catch (err) {
        console.error('[paypal] ביטול אישור תשלום נכשל:', err.message);
      }
    }
  }
  await markListingPaymentVoided(payment.id);
}
