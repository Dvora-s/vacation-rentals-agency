import { publishApprovedListing } from '../services/listingPublishService.js';
import {
  selectAllListingPaymentsAdmin,
  selectAvailableSlotPayments,
  selectMineListingPayments,
} from '../models/listingPaymentModel.js';

const LISTING_FEE_PER_MONTH = 30;

export async function createListingPayment(req, res) {
  const {
    apartment_id,
    months = 1,
    tier = 'standard',
    provider,
    provider_reference = null,
    listing_payment_id = null,
    use_existing_slot = false,
  } = req.body || {};

  if (!apartment_id) {
    return res.status(400).json({ error: 'נדרש מזהה דירה (apartment_id)' });
  }

  try {
    const result = await publishApprovedListing({
      apartmentId: apartment_id,
      userId: req.user.id,
      months,
      tier,
      provider,
      providerReference: provider_reference,
      listingPaymentId: listing_payment_id,
      useExistingSlot: Boolean(use_existing_slot),
    });
    res.status(201).json(result.payment);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || 'פרסום המודעה נכשל' });
  }
}

export async function listAvailableSlots(req, res) {
  const tier = req.query.tier === 'premium' ? 'premium' : req.query.tier === 'standard' ? 'standard' : null;
  const rows = await selectAvailableSlotPayments(req.user.id, tier);
  const slots = rows.map((row) => ({
    id: row.id,
    tier: row.tier,
    slots_total: Number(row.slots_total) || 1,
    slots_used: Number(row.slots_used) || 0,
    slots_remaining: Math.max(0, (Number(row.slots_total) || 1) - (Number(row.slots_used) || 0)),
    period_end: row.period_end,
    months: row.months,
  }));
  res.json(slots);
}

export async function listMineListingPayments(req, res) {
  const rows = await selectMineListingPayments(req.user.id);
  res.json(rows);
}

export async function listAllListingPaymentsAdmin(_req, res) {
  const rows = await selectAllListingPaymentsAdmin();
  res.json(rows);
}

export function getListingFee(_req, res) {
  res.json({ amount_per_month: LISTING_FEE_PER_MONTH, currency: 'ILS' });
}
