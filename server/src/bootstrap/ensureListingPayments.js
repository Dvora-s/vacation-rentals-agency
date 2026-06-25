import { repairLegacySwappedListingPaymentStatuses } from '../models/listingPaymentModel.js';

/** מתקן תשלומי פרסום ישנים עם status/provider הפוכים — כדי שדירות pending יופיעו אצל המנהל. */
export async function ensureListingPaymentsIntegrity() {
  const fixed = await repairLegacySwappedListingPaymentStatuses();
  if (fixed > 0) {
    console.log(`[listing_payments] תוקנו ${fixed} שורות תשלום עם סטטוס שגוי`);
  }
}
