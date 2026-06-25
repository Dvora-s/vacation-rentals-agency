import pool from '../config/db.js';

export async function selectApartmentByIdForListing(id) {
  const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function insertListingPaymentRowLegacy(params) {
  const [result] = await pool.query(
    `INSERT INTO listing_payments
      (apartment_id, user_id, amount, currency, months, status, provider, provider_reference,
       paid_at, period_start, period_end)
     VALUES (?, ?, ?, 'ILS', ?, 'paid', ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    params,
  );
  return result.insertId;
}

export async function insertListingPaymentRow({
  apartmentId,
  userId,
  amount,
  months,
  provider,
  providerReference,
  periodStart,
  periodEnd,
  slotsTotal = 1,
  slotsUsed = 1,
  tier = null,
}) {
  const base = [
    apartmentId,
    userId,
    amount,
    months,
    provider,
    providerReference,
    periodStart,
    periodEnd,
  ];
  try {
    const [result] = await pool.query(
      `INSERT INTO listing_payments
        (apartment_id, user_id, amount, currency, months, status, provider, provider_reference,
         paid_at, period_start, period_end, slots_total, slots_used, tier)
       VALUES (?, ?, ?, 'ILS', ?, 'paid', ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)`,
      [...base, slotsTotal, slotsUsed, tier],
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    return insertListingPaymentRowLegacy(base);
  }
}

export async function insertSlotBundlePaymentRow({
  apartmentId,
  userId,
  months,
  tier,
  bundleId,
  periodStart,
  periodEnd,
}) {
  return insertListingPaymentRow({
    apartmentId,
    userId,
    amount: 0,
    months,
    provider: 'slot_bundle',
    providerReference: `bundle:${bundleId}`,
    periodStart,
    periodEnd,
    slotsTotal: 1,
    slotsUsed: 1,
    tier,
  });
}

export async function selectListingPaymentById(id) {
  const [payRows] = await pool.query('SELECT * FROM listing_payments WHERE id = ?', [id]);
  return payRows[0] || null;
}

export async function selectAvailableSlotPayments(userId, tier = null) {
  try {
    const [rows] = await pool.query(
      `SELECT lp.*
       FROM listing_payments lp
       WHERE lp.user_id = ?
         AND lp.status = 'paid'
         AND lp.slots_used < lp.slots_total
         AND (lp.period_end IS NULL OR lp.period_end >= CURDATE())
         AND (? IS NULL OR lp.tier = ? OR lp.tier IS NULL)
       ORDER BY lp.period_end ASC, lp.id ASC`,
      [userId, tier, tier],
    );
    return rows;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    return [];
  }
}

export async function incrementListingPaymentSlotUsed(paymentId) {
  try {
    await pool.query(
      `UPDATE listing_payments SET slots_used = slots_used + 1 WHERE id = ? AND slots_used < slots_total`,
      [paymentId],
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }
}

export async function selectMineListingPayments(userId) {
  const [rows] = await pool.query(
    `SELECT lp.*, a.title AS apartment_title
     FROM listing_payments lp
     LEFT JOIN apartments a ON a.id = lp.apartment_id
     WHERE lp.user_id = ?
     ORDER BY lp.created_at DESC`,
    [userId],
  );
  return rows;
}

export async function apartmentHasPaidListing(apartmentId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM listing_payments
     WHERE apartment_id = ? AND status = 'paid'
     LIMIT 1`,
    [apartmentId],
  );
  return rows.length > 0;
}

export async function selectAllListingPaymentsAdmin() {
  const [rows] = await pool.query(
    `SELECT lp.*, a.title AS apartment_title, u.email AS user_email
     FROM listing_payments lp
     LEFT JOIN apartments a ON a.id = lp.apartment_id
     LEFT JOIN users u ON u.id = lp.user_id
     ORDER BY lp.created_at DESC`,
  );
  return rows;
}
