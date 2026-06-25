import { markApartmentPendingAfterPayment, updateApartmentExpiryFromPayment } from '../models/apartmentModel.js';
import { insertListingPaymentRow } from '../models/listingPaymentModel.js';
import { notifyAdminNewListing } from './listingAdminNotify.js';

const DEFAULT_ADMIN_FREE_MONTHS = 12;

/**
 * מנהל שולח דירה חדשה לאישור ללא תשלום (ממתינה לתשלום → pending).
 */
export async function submitApartmentFreeForAdmin(apartmentId, user) {
  const monthsInt = DEFAULT_ADMIN_FREE_MONTHS;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

  await insertListingPaymentRow({
    apartmentId,
    userId: user.id,
    amount: 0,
    months: monthsInt,
    provider: 'admin_free',
    providerReference: 'admin-bypass',
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    slotsTotal: 1,
    slotsUsed: 1,
    tier: 'standard',
  });

  await updateApartmentExpiryFromPayment({
    apartmentId,
    periodEnd,
  });

  const submitted = await markApartmentPendingAfterPayment(apartmentId);
  if (!submitted) {
    throw new Error('לא ניתן לשלוח את הדירה לאישור');
  }

  try {
    await notifyAdminNewListing(apartmentId, {
      userId: user.id,
      userEmail: user.email,
    });
  } catch (err) {
    console.error('[mailer] התראת דירה חדשה למנהל (מנהל) נכשלה:', err.message);
  }

  return { months: monthsInt, periodEnd };
}
