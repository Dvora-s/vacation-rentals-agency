import {
  publishApartmentAfterPayment,
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
import { sendListingLiveEmail, sendPaymentReceiptEmail } from '../utils/mailer.js';
import { selectUserBillingById } from '../models/userModel.js';
import { isPremiumApartment } from '../config/pricing.js';

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

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

async function notifyPublished({ apt, apartment, payment, amount, tier, monthsInt, provider, userId }) {
  const u = await selectUserBillingById(userId);
  const billingName = apt.owner_name || u?.full_name || '';
  const billingEmail = u?.email || apt.owner_email || null;
  const billingAddress = [apt.address, apt.location].filter(Boolean).join(', ');

  if (billingEmail && payment && amount > 0) {
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
            ? 'תשלום מאובטח ב־PayPal'
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

  if (billingEmail && apartment) {
    await sendListingLiveEmail({
      to: billingEmail,
      ownerName: billingName,
      apartment,
      listingUrl: `${APP_URL}/apartments/${apartment.id}`,
      editUrl: `${APP_URL}/my-apartments/${apartment.id}/edit`,
    });
  }
}

/** פרסום דירה מאושרת — תשלום (או מבצע/מסלול) ואז עלייה לאוויר */
export async function publishApprovedListing({
  apartmentId,
  userId,
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
  if (apt.status !== 'awaiting_payment') {
    const err = new Error('ניתן לפרסם רק דירה שאושרה על ידי המנהל וממתינה לתשלום');
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

  if (bundlePayment && Number(bundlePayment.slots_used) < Number(bundlePayment.slots_total)) {
    if (bundlePayment.user_id !== userId) {
      const err = new Error('אין הרשאה להשתמש במסלול זה');
      err.statusCode = 403;
      throw err;
    }
    const periodEnd = bundlePayment.period_end ? new Date(bundlePayment.period_end) : new Date();
    const paymentInsertId = await insertSlotBundlePaymentRow({
      apartmentId,
      userId,
      months: monthsInt,
      tier,
      bundleId: bundlePayment.id,
      periodStart: bundlePayment.period_start,
      periodEnd: bundlePayment.period_end,
    });
    await incrementListingPaymentSlotUsed(bundlePayment.id);
    await updateApartmentExpiryFromPayment({ apartmentId, periodEnd });
    const published = await publishApartmentAfterPayment(apartmentId);
    if (!published) {
      const err = new Error('לא ניתן לפרסם את הדירה');
      err.statusCode = 409;
      throw err;
    }
    const payment = await selectListingPaymentById(paymentInsertId);
    const apartment = await attachImagesToApartment(await selectApartmentById(apartmentId));
    await notifyPublished({
      apt,
      apartment,
      payment,
      amount: 0,
      tier,
      monthsInt,
      provider: 'slot_bundle',
      userId,
    });
    return { payment, apartment, published: true };
  }

  if (amount <= 0) {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + monthsInt);
    const paymentInsertId = await insertListingPaymentRow({
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
    await updateApartmentExpiryFromPayment({ apartmentId, periodEnd });
    const published = await publishApartmentAfterPayment(apartmentId);
    if (!published) {
      const err = new Error('לא ניתן לפרסם את הדירה');
      err.statusCode = 409;
      throw err;
    }
    const payment = await selectListingPaymentById(paymentInsertId);
    const apartment = await attachImagesToApartment(await selectApartmentById(apartmentId));
    await notifyPublished({
      apt,
      apartment,
      payment,
      amount: 0,
      tier,
      monthsInt,
      provider: 'promo_free',
      userId,
    });
    return { payment, apartment, published: true };
  }

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

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

  const paymentInsertId = await insertListingPaymentRow({
    apartmentId,
    userId,
    amount,
    months: monthsInt,
    provider: normalizedProvider,
    providerReference: String(providerReference).trim(),
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    slotsTotal: listingSlots,
    slotsUsed: 1,
    tier,
  });

  await updateApartmentExpiryFromPayment({ apartmentId, periodEnd });
  const published = await publishApartmentAfterPayment(apartmentId);
  if (!published) {
    const err = new Error('התשלום נרשם אך לא ניתן לפרסם את הדירה. פנו לתמיכה.');
    err.statusCode = 409;
    throw err;
  }

  const payment = await selectListingPaymentById(paymentInsertId);
  const apartment = await attachImagesToApartment(await selectApartmentById(apartmentId));
  await notifyPublished({
    apt,
    apartment,
    payment,
    amount,
    tier,
    monthsInt,
    provider: normalizedProvider,
    userId,
  });

  return { payment, apartment, published: true };
}
