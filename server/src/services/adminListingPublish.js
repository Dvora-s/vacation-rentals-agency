import { markApartmentPendingForReview, updateApartmentExpiryFromPayment } from '../models/apartmentModel.js';
import { insertListingPaymentRow } from '../models/listingPaymentModel.js';
import { notifyAdminNewListing } from './listingAdminNotify.js';

const DEFAULT_ADMIN_FREE_MONTHS = 12;

/**
 * מנהל מפרסם דירה ללא תשלום — רושם תשלום בסכום 0 ומעביר לאישור מנהל.
 */
export async function publishApartmentFreeForAdmin(apartmentId, user) {
  const monthsInt = DEFAULT_ADMIN_FREE_MONTHS;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

  await insertListingPaymentRow([
    apartmentId,
    user.id,
    0,
    monthsInt,
    'admin_free',
    'admin-bypass',
    periodStart.toISOString().slice(0, 10),
    periodEnd.toISOString().slice(0, 10),
  ]);

  await updateApartmentExpiryFromPayment({
    apartmentId,
    periodEnd,
    wasExpired: false,
  });

  const moved = await markApartmentPendingForReview(apartmentId);
  if (!moved) {
    throw new Error('לא ניתן לעדכן את סטטוס הדירה לאישור מנהל');
  }

  try {
    await notifyAdminNewListing(apartmentId, {
      userId: user.id,
      userEmail: user.email,
    });
  } catch (err) {
    console.error('[mailer] התראת דירה חדשה (מנהל) נכשלה:', err.message);
  }

  return { months: monthsInt, periodEnd };
}
