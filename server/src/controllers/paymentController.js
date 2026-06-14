import pool from '../config/db.js';
import { logger } from '../utils/logger.js';
import {
  createPayment as paymeCreatePayment,
  getPaymentStatus as paymeGetRemoteStatus,
  handleWebhook as paymeHandleWebhook,
  mapRemoteStatusToLocal,
  normalizePayMeError,
  verifyPayment as paymeVerifyPayment,
} from '../services/paymeService.js';

function appBaseUrl() {
  const raw = String(process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return raw;
}

/**
 * POST /api/payments/create
 * Auth: required — payment rows are always tied to a user_id.
 */
export async function createPayMePayment(req, res) {
  let paymentId = 0;
  let userId = 0;
  try {
    userId = req.user.id;
    const { amount, currency, description, metadata } = req.paymeCreate;

    const returnUrl =
      String(req.body?.return_url || '').trim() ||
      `${appBaseUrl()}/pay/success?provider=payme`;
    const cancelUrl =
      String(req.body?.cancel_url || '').trim() || `${appBaseUrl()}/pay/failed?provider=payme`;

    if (!/^https?:\/\//i.test(returnUrl) || !/^https?:\/\//i.test(cancelUrl)) {
      return res.status(400).json({ error: 'return_url and cancel_url must be http(s) URLs' });
    }

    const [ins] = await pool.query(
      `INSERT INTO payments (user_id, payme_transaction_id, amount, currency, status)
       VALUES (?, NULL, ?, ?, 'pending')`,
      [userId, amount, currency],
    );
    paymentId = ins.insertId;

    const idempotencyKey = `pay-${paymentId}-${userId}`;

    const remote = await paymeCreatePayment({
      amount,
      currency,
      description: description || `Payment #${paymentId}`,
      returnUrl: appendQuery(returnUrl, { paymentId }),
      cancelUrl: appendQuery(cancelUrl, { paymentId }),
      idempotencyKey,
      metadata: { ...metadata, internal_payment_id: paymentId, user_id: userId },
    });

    await pool.query(
      `UPDATE payments
       SET payme_transaction_id = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [remote.paymeTransactionId, paymentId, userId],
    );

    return res.status(201).json({
      paymentId,
      checkoutUrl: remote.checkoutUrl,
      paymeTransactionId: remote.paymeTransactionId,
      status: 'pending',
    });
  } catch (error) {
    try {
      if (typeof paymentId === 'number' && paymentId > 0) {
        await pool.query(
          `UPDATE payments SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
          [paymentId, userId],
        );
      }
    } catch {
      /* ignore secondary failures */
    }
    const norm = normalizePayMeError(error, 'create');
    return res.status(norm.status).json({ error: norm.message, code: norm.code });
  }
}

function appendQuery(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * GET /api/payments/:id/status
 * Returns DB status; optionally syncs from PayMe when `sync=1`.
 */
export async function getPayMePaymentStatus(req, res) {
  try {
    const userId = req.user.id;
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ error: 'Invalid payment id' });
    }

    const [rows] = await pool.query(
      `SELECT id, user_id, payme_transaction_id, amount, currency, status, created_at, updated_at
       FROM payments WHERE id = ?`,
      [paymentId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const row = rows[0];
    if (row.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sync = String(req.query.sync || '') === '1' || String(req.query.sync || '') === 'true';
    if (sync && row.payme_transaction_id) {
      try {
        const remote = await paymeGetRemoteStatus(row.payme_transaction_id);
        // TODO: Parse remote.status from actual PayMe payload shape.
        const remoteStatus =
          remote?.status || remote?.payment_status || remote?.state || remote?.data?.status;
        if (remoteStatus) {
          const local = mapRemoteStatusToLocal(String(remoteStatus));
          await pool.query(
            `UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [local, paymentId],
          );
          row.status = local;
        }
      } catch {
        // If remote sync fails, still return DB snapshot (frontend can retry).
      }
    }

    return res.json({
      id: row.id,
      paymeTransactionId: row.payme_transaction_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    const norm = normalizePayMeError(error, 'status');
    return res.status(norm.status).json({ error: norm.message, code: norm.code });
  }
}

/**
 * Express handler for POST /api/payments/webhook
 * Must be mounted with `express.raw({ type: 'application/json' })` so signature verification is reliable.
 */
export async function handlePayMeWebhookRequest(req, res) {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const verified = paymeHandleWebhook(rawBody, req.headers);
    if (!verified.ok) {
      return res.status(400).json({ error: verified.reason });
    }

    const localStatus = mapRemoteStatusToLocal(verified.status);

    const [result] = await pool.query(
      `UPDATE payments
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE payme_transaction_id = ?`,
      [localStatus, verified.transactionId],
    );

    const updated = result.affectedRows || 0;
    if (!updated) {
      logger.warn(
        `[PayMe webhook] No local row matched payme_transaction_id=${verified.transactionId}. Check transaction id mapping / migration.`,
      );
    }

    // PayMe expects fast 2xx; avoid heavy work here.
    return res.status(200).json({ ok: true, updated });
  } catch (error) {
    // Still return 200 if PayMe retries aggressively? For now: 500 so provider retries on transient errors.
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Webhook error' });
  }
}

/**
 * Optional: server-to-server verify after redirect (not exposed as route unless you add it).
 * Exported for tests / future routes.
 */
export async function verifyPayMeRemoteTransaction(paymeTransactionId) {
  return paymeVerifyPayment(paymeTransactionId);
}
