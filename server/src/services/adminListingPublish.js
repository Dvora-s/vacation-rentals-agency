import { publishApartmentAfterPayment, updateApartmentExpiryFromPayment } from '../models/apartmentModel.js';
import { insertListingPaymentRow } from '../models/listingPaymentModel.js';

const DEFAULT_ADMIN_FREE_MONTHS = 12;

/**
 * מנהל מפרסם דירה מאושרת (ממתינה לתשלום) ללא תשלום.
 */
export async function publishApartmentFreeForAdmin(apartmentId, user) {
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

  const published = await publishApartmentAfterPayment(apartmentId);
  if (!published) {
    throw new Error('לא ניתן לפרסם את הדירה ללא תשלום');
  }

  return { months: monthsInt, periodEnd };
}
