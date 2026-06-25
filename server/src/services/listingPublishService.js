import {
  markApartmentPendingAfterPayment,
  updateApartmentExpiryFromPayment,
} from '../models/apartmentModel.js';
import { attachImagesToApartment, selectApartmentById } from '../models/apartmentModel.js';
import {
  incrementListingPaymentSlotUsed,
  insertListingPaymentRow,
  insertSlotBundlePaymentRow,
  selectAvailableSlotPayments,
  selectListingPaymentById,
} from '../models/listingPaymentModel.js';
import { resolveListingAmount } from './listingPricing.js';
import { sendPaymentReceiptEmail } from '../utils/mailer.js';
import { notifyAdminNewListing } from './listingAdminNotify.js';
import { selectUserBillingById } from '../models/userModel.js';
import { isPremiumApartment } from '../config/pricing.js';
import { paypalGetAuthorization } from './paypalRest.js';

function extractPayPalAuthorizationId(providerReference) {
  const ref = String(providerReference || '').trim();
  if (!ref) return null;
  if (ref.startsWith('auth:')) return ref.slice(5);
  if (ref.startsWith('capture:')) return null;
  return ref;
}

function formatHebrewDate(date) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function sendReceiptAndNotifyAdmin({
  apt,
  apartment,
  payment,
  amount,
  tier,
  monthsInt,
  provider,
  userId,
  userEmail,
  sendReceipt = true,
}) {
  const u = await selectUserBillingById(userId);
  const billingName = apt.owner_name || u?.full_name || '';
  const billingEmail = u?.email || apt.owner_email || userEmail || null;
  const billingAddress = [apt.address, apt.location].filter(Boolean).join(', ');

  if (sendReceipt && billingEmail && payment && amount > 0) {
    await sendPaymentReceiptEmail({
      to: billingEmail,
      order: {
        number: String(10000 + payment.id),
        date: formatHebrewDate(new Date()),
        items: [
          {
            name: `מנוי פרסום מודעה${tier === 'premium' ? ' (מתחם אירוח)' : ''} – ${monthsInt} ${monthsInt === 1 ? 'חודש' : 'חודשים'}`,
            qty: 1,
            price: amount,
          },
        ],
        total: amount,
        paymentMethod:
          provider === 'paypal'
            ? 'תשלום מאובטח ב־PayPal (חיוב עם פרסום המודעה)'
            : provider === 'payme'
              ? 'תשלום מאובטח בכרטיס אשראי (PayMe)'
              : provider === 'promo_free'
                ? 'מבצע — ללא חיוב'
                : provider === 'slot_bundle'
                  ? 'מסלול קיים (דירה נוספת)'
                  : 'תשלום מאובטח',
        billing: { name: billingName, address: billingAddress, email: billingEmail },
      },
    });
  }

  try {
    await notifyAdminNewListing(apartment.id, {
      userId,
      userEmail: userEmail || billingEmail,
    });
  } catch (err) {
    console.error('[mailer] התראת דירה חדשה למנהל אחרי תשלום נכשלה:', err.message);
  }
}

/**
 * תשלום על פרסום — הדירה עוברת ל-pending (ממתינה לאישור), לא מתפרסמת עדיין.
 * פרסום באתר רק אחרי אישור מנהל.
 */
export async function submitListingPaymentForApproval({
  apartmentId,
  userId,
  userEmail,
  months,
  tier: requestedTier,
  provider,
  providerReference,
  listingPaymentId = null,
  useExistingSlot = false,
}) {
  const apt = await selectApartmentById(apartmentId);
  if (!apt) {
    const err = new Error('דירה לא נמצאה');
    err.statusCode = 404;
    throw err;
  }
  if (apt.status !== 'awaiting_payment' && apt.status !== 'expired') {
    const err = new Error('ניתן לשלם רק עבור דירה חדשה או מודעה שפג תוקפה');
    err.statusCode = 400;
    throw err;
  }

  const tier = isPremiumApartment(apt) || requestedTier === 'premium' ? 'premium' : 'standard';
  const monthsInt = Math.max(1, Number(months) || 1);
  const quote = await resolveListingAmount(tier, monthsInt);
  const amount = quote.amount;
  const listingSlots = quote.listingSlots ?? 1;

  let bundlePayment = null;
  if (listingPaymentId) {
    bundlePayment = await selectListingPaymentById(listingPaymentId);
  } else if (useExistingSlot) {
    const available = await selectAvailableSlotPayments(userId, tier);
    bundlePayment = available[0] || null;
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

  let paymentInsertId;
  let finalProvider = provider;
  let finalAmount = amount;

  if (bundlePayment && Number(bundlePayment.slots_used) < Number(bundlePayment.slots_total)) {
    if (bundlePayment.user_id !== userId) {
      const err = new Error('אין הרשאה להשתמש במסלול זה');
      err.statusCode = 403;
      throw err;
    }
    paymentInsertId = await insertSlotBundlePaymentRow({
      apartmentId,
      userId,
      months: monthsInt,
      tier,
      bundleId: bundlePayment.id,
      periodStart: bundlePayment.period_start || periodStart.toISOString().slice(0, 10),
      periodEnd: bundlePayment.period_end || periodEnd.toISOString().slice(0, 10),
    });
    await incrementListingPaymentSlotUsed(bundlePayment.id);
    finalProvider = 'slot_bundle';
    finalAmount = 0;
    await updateApartmentExpiryFromPayment({
      apartmentId,
      periodEnd: bundlePayment.period_end ? new Date(bundlePayment.period_end) : periodEnd,
    });
  } else if (amount <= 0) {
    paymentInsertId = await insertListingPaymentRow({
      apartmentId,
      userId,
      amount: 0,
      months: monthsInt,
      provider: 'promo_free',
      providerReference: providerReference || 'promo-zero',
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      slotsTotal: listingSlots,
      slotsUsed: 1,
      tier,
    });
    finalProvider = 'promo_free';
    finalAmount = 0;
    await updateApartmentExpiryFromPayment({ apartmentId, periodEnd });
  } else {
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    if (!['paypal', 'payme'].includes(normalizedProvider)) {
      const err = new Error('יש לבחור תשלום דרך PayPal או PayMe');
      err.statusCode = 400;
      throw err;
    }
    if (!String(providerReference || '').trim()) {
      const err = new Error('חסרה אסמכתא תשלום מהספק');
      err.statusCode = 400;
      throw err;
    }

    let paymentStatus = 'paid';
    let providerRef = String(providerReference).trim();

    if (normalizedProvider === 'paypal') {
      const authId = extractPayPalAuthorizationId(providerRef);
      if (!authId) {
        const err = new Error('אסמכתת PayPal לא תקינה — נדרש אישור תשלום (לא חיוב מיידי)');
        err.statusCode = 400;
        throw err;
      }
      const auth = await paypalGetAuthorization(authId);
      const authStatus = String(auth?.status || '').toUpperCase();
      if (!['CREATED', 'PENDING', 'PARTIALLY_CAPTURED'].includes(authStatus)) {
        const err = new Error('אישור התשלום ב־PayPal אינו בתוקף');
        err.statusCode = 400;
        throw err;
      }
      paymentStatus = 'authorized';
      providerRef = `auth:${authId}`;
    }

    paymentInsertId = await insertListingPaymentRow({
      apartmentId,
      userId,
      amount,
      months: monthsInt,
      provider: normalizedProvider,
      providerReference: providerRef,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      slotsTotal: listingSlots,
      slotsUsed: 1,
      tier,
      paymentStatus,
    });
    finalProvider = normalizedProvider;
    await updateApartmentExpiryFromPayment({ apartmentId, periodEnd });
  }

  const moved = await markApartmentPendingAfterPayment(apartmentId);
  if (!moved) {
    const err = new Error('התשלום נרשם אך לא ניתן לשלוח את הדירה לאישור. פנו לתמיכה.');
    err.statusCode = 409;
    throw err;
  }

  const payment = await selectListingPaymentById(paymentInsertId);
  const apartment = await attachImagesToApartment(await selectApartmentById(apartmentId));

  await sendReceiptAndNotifyAdmin({
    apt,
    apartment,
    payment,
    amount: finalAmount,
    tier,
    monthsInt,
    provider: finalProvider,
    userId,
    userEmail,
    sendReceipt: finalProvider !== 'paypal',
  });

  return { payment, apartment, submitted: true };
}
