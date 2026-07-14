import pool from '../config/db.js';

export async function insertPendingPayment(userId, amount, currency) {
  const [ins] = await pool.query(
    `INSERT INTO payments (user_id, payme_transaction_id, amount, currency, status)
     VALUES (?, NULL, ?, ?, 'pending')`,
    [userId, amount, currency],
  );
  return ins.insertId;
}

export async function updatePaymentPaymeSaleId(paymentId, userId, paymeSaleId) {
  await pool.query(
    `UPDATE payments
     SET payme_transaction_id = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [paymeSaleId, paymentId, userId],
  );
}

/** @deprecated use updatePaymentPaymeSaleId */
export async function updatePaymentPaymeTransaction(paymentId, userId, paymeTransactionId) {
  return updatePaymentPaymeSaleId(paymentId, userId, paymeTransactionId);
}

export async function markPaymentFailed(paymentId, userId) {
  await pool.query(
    `UPDATE payments SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    [paymentId, userId],
  );
}

export async function selectPaymentByPaymeSaleId(paymeSaleId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, payme_transaction_id, amount, currency, status, created_at, updated_at
     FROM payments WHERE payme_transaction_id = ?`,
    [paymeSaleId],
  );
  return rows[0] || null;
}

export async function selectPaymentByPaymeTransactionId(paymeTransactionId) {
  return selectPaymentByPaymeSaleId(paymeTransactionId);
}

export async function selectPaymentById(paymentId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, payme_transaction_id, amount, currency, status, created_at, updated_at
     FROM payments WHERE id = ?`,
    [paymentId],
  );
  return rows[0] || null;
}

export async function updatePaymentStatusById(paymentId, status) {
  await pool.query(
    `UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, paymentId],
  );
}

export async function updatePaymentStatusByPaymeSaleId(localStatus, paymeSaleId, paymeTransactionId) {
  const [result] = await pool.query(
    `UPDATE payments
     SET status = ?,
         payme_transaction_id = COALESCE(?, payme_transaction_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE payme_transaction_id = ?`,
    [localStatus, paymeTransactionId || null, paymeSaleId],
  );
  return result.affectedRows || 0;
}

/** @deprecated */
export async function updatePaymentStatusByPaymeTransactionId(localStatus, paymeTransactionId) {
  const [result] = await pool.query(
    `UPDATE payments
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE payme_transaction_id = ?`,
    [localStatus, paymeTransactionId],
  );
  return result.affectedRows || 0;
}

/**
 * Apply IPN callback to the payments table (mock DB persistence).
 * @param {object} params
 * @param {string} params.paymeSaleId
 * @param {string} [params.paymeTransactionId]
 * @param {string} params.localStatus
 * @param {string} [params.internalTransactionId]
 */
export async function applyPayMeCallbackToPayment({
  paymeSaleId,
  paymeTransactionId,
  localStatus,
  internalTransactionId,
}) {
  let updated = 0;

  if (paymeSaleId) {
    updated = await updatePaymentStatusByPaymeSaleId(
      localStatus,
      paymeSaleId,
      paymeTransactionId || undefined,
    );
  }

  if (!updated && internalTransactionId && /^\d+$/.test(internalTransactionId)) {
    const row = await selectPaymentById(Number(internalTransactionId));
    if (row) {
      await updatePaymentStatusById(row.id, localStatus);
      if (paymeSaleId && !row.payme_transaction_id) {
        await pool.query(
          `UPDATE payments SET payme_transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [paymeSaleId, row.id],
        );
      }
      updated = 1;
    }
  }

  return updated;
}
