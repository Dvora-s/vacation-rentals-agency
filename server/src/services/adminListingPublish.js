import {
  approveApartmentRowDirect,
  attachImagesToApartment,
  selectApartmentById,
  updateApartmentExpiryFromPayment,
} from '../models/apartmentModel.js';
import { insertListingPaymentRow, apartmentHasSecuredListingPayment } from '../models/listingPaymentModel.js';
import { selectUserContactById } from '../models/userModel.js';
import { sendListingLiveEmail } from '../utils/mailer.js';

const DEFAULT_ADMIN_FREE_MONTHS = 12;
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

async function resolveOwnerEmail(apt) {
  let ownerEmail = apt.owner_email || null;
  if (!ownerEmail && apt.owner_id) {
    const u = await selectUserContactById(apt.owner_id);
    ownerEmail = u?.email || null;
  }
  return ownerEmail;
}

/**
 * מנהל מפרסם דירה מיד — ללא תשלום וללא המתנה לאישור מנהל נוסף.
 */
export async function publishApartmentInstantlyForAdmin(apartmentId, user) {
  const monthsInt = DEFAULT_ADMIN_FREE_MONTHS;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

  const existing = await selectApartmentById(apartmentId);
  if (!existing) {
    throw new Error('דירה לא נמצאה');
  }

  if (existing.status === 'approved') {
    const apartment = await attachImagesToApartment(existing);
    return { months: monthsInt, periodEnd, apartment };
  }

  const hasPayment = await apartmentHasSecuredListingPayment(apartmentId);

  if (!hasPayment) {
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
  }

  await updateApartmentExpiryFromPayment({
    apartmentId,
    periodEnd,
  });

  const approved = await approveApartmentRowDirect(apartmentId);
  if (!approved) {
    throw new Error('לא ניתן לפרסם את הדירה');
  }

  const row = await selectApartmentById(apartmentId);
  const apartment = await attachImagesToApartment(row);

  const ownerEmail = await resolveOwnerEmail(apartment);
  if (ownerEmail) {
    try {
      await sendListingLiveEmail({
        to: ownerEmail,
        apartment,
        listingUrl: `${APP_URL}/apartments/${apartment.id}`,
        editUrl: `${APP_URL}/my-apartments/${apartment.id}/edit`,
      });
    } catch (err) {
      console.error('[mailer] מייל "המודעה באוויר" (מנהל) נכשל:', err.message);
    }
  }

  return { months: monthsInt, periodEnd, apartment };
}

/** @deprecated השתמשו ב-publishApartmentInstantlyForAdmin */
export async function submitApartmentFreeForAdmin(apartmentId, user) {
  const result = await publishApartmentInstantlyForAdmin(apartmentId, user);
  return { months: result.months, periodEnd: result.periodEnd };
}
