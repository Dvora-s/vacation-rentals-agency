import pool from '../config/db.js';

export async function selectApartmentByIdForListing(id) {
  const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function insertListingPaymentRowLegacy(params, paymentStatus = 'paid') {
  const paidAtSql = paymentStatus === 'paid' ? 'CURRENT_TIMESTAMP' : 'NULL';
  const [result] = await pool.query(
    `INSERT INTO listing_payments
      (apartment_id, user_id, amount, currency, months, status, provider, provider_reference,
       paid_at, period_start, period_end)
     VALUES (?, ?, ?, 'ILS', ?, ?, ?, ?, ${paidAtSql}, ?, ?)`,
    [...params.slice(0, 5), paymentStatus, ...params.slice(5)],
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
  paymentStatus = 'paid',
}) {
  const status = paymentStatus === 'authorized' ? 'authorized' : 'paid';
  const paidAtSql = status === 'paid' ? 'CURRENT_TIMESTAMP' : 'NULL';
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
       VALUES (?, ?, ?, 'ILS', ?, ?, ?, ?, ${paidAtSql}, ?, ?, ?, ?, ?)`,
      [...base.slice(0, 4), status, ...base.slice(4), slotsTotal, slotsUsed, tier],
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    return insertListingPaymentRowLegacy(base, status);
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

/** תשלום שבוצע או אושר (החיוב מושהה עד אישור מנהל) */
export async function apartmentHasSecuredListingPayment(apartmentId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM listing_payments
     WHERE apartment_id = ? AND status IN ('paid', 'authorized')
     LIMIT 1`,
    [apartmentId],
  );
  return rows.length > 0;
}

export async function selectLatestListingPaymentForApartment(apartmentId, statuses = ['authorized', 'paid']) {
  const list = Array.isArray(statuses) && statuses.length > 0 ? statuses : ['authorized', 'paid'];
  const placeholders = list.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT * FROM listing_payments
     WHERE apartment_id = ? AND status IN (${placeholders})
     ORDER BY id DESC
     LIMIT 1`,
    [apartmentId, ...list],
  );
  return rows[0] || null;
}

export async function markListingPaymentCaptured(paymentId, captureReference) {
  await pool.query(
    `UPDATE listing_payments
     SET status = 'paid', paid_at = CURRENT_TIMESTAMP, provider_reference = ?
     WHERE id = ? AND status = 'authorized'`,
    [captureReference, paymentId],
  );
}

export async function markListingPaymentVoided(paymentId) {
  await pool.query(
    `UPDATE listing_payments SET status = 'voided' WHERE id = ? AND status = 'authorized'`,
    [paymentId],
  );
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
