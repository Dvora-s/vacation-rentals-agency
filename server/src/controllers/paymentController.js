import {
  applyPayMeCallbackToPayment,
  insertPendingPayment,
  markPaymentFailed,
  selectPaymentById,
  updatePaymentPaymeSaleId,
} from '../models/paymentModel.js';
import { logger } from '../utils/logger.js';
import { HttpError } from '../utils/HttpError.js';
import {
  generatePaymentSession,
  logPayMeCallback,
  normalizePayMeError,
  parsePayMeCallback,
} from '../services/paymeService.js';

function appBaseUrl() {
  return String(process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Shared logic: create DB row + call PayMe Generate Payment API.
 */
async function bootstrapPayMeSession(req, res) {
  const userId = req.user.id;
  const { priceAgorot, amountMajor, currency, productName, metadata } = req.paymeCreate;

  const returnUrl =
    String(req.body?.return_url || '').trim() ||
    `${appBaseUrl()}/pay/success?provider=payme`;
  const cancelUrl =
    String(req.body?.cancel_url || '').trim() || `${appBaseUrl()}/pay/failed?provider=payme`;

  if (returnUrl && !/^https?:\/\//i.test(returnUrl)) {
    return res.status(400).json({ error: 'return_url must be an http(s) URL when provided' });
  }
  if (cancelUrl && !/^https?:\/\//i.test(cancelUrl)) {
    return res.status(400).json({ error: 'cancel_url must be an http(s) URL when provided' });
  }

  const paymentId = await insertPendingPayment(userId, amountMajor, currency);

  try {
    const remote = await generatePaymentSession({
      priceAgorot,
      currency,
      productName,
      transactionId: String(paymentId),
      returnUrl: appendQuery(returnUrl, { paymentId }),
    });

    await updatePaymentPaymeSaleId(paymentId, userId, remote.paymeSaleId);

    return res.status(201).json({
      paymentId,
      payme_sale_id: remote.paymeSaleId,
      paymeSaleId: remote.paymeSaleId,
      saleUrl: remote.saleUrl,
      status: 'pending',
    });
  } catch (error) {
    await markPaymentFailed(paymentId, userId).catch(() => {});
    const norm = normalizePayMeError(error, 'create-session');
    throw new HttpError(norm.status, norm.message, norm.code);
  }
}

function appendQuery(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** POST /api/payments/create-session — iFrame / Hosted Fields (Option 2) */
export async function createPayMeSession(req, res) {
  return bootstrapPayMeSession(req, res);
}

/** POST /api/payments/create — backward-compatible alias */
export async function createPayMePayment(req, res) {
  return bootstrapPayMeSession(req, res);
}

export async function getPayMePaymentStatus(req, res) {
  const userId = req.user.id;
  const paymentId = Number(req.params.id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return res.status(400).json({ error: 'Invalid payment id' });
  }

  const row = await selectPaymentById(paymentId);
  if (!row) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  if (row.user_id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json({
    id: row.id,
    paymeTransactionId: row.payme_transaction_id,
    paymeSaleId: row.payme_transaction_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/**
 * POST /api/payments/callback — PayMe IPN (notify_url).
 * Body format: application/x-www-form-urlencoded (parsed by express.urlencoded).
 */
export async function handlePayMeCallback(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = parsePayMeCallback(body);
  logPayMeCallback(parsed);

  if (!parsed.paymeSaleId && !parsed.transactionId) {
    logger.warn('[PayMe callback] Missing payme_sale_id and transaction_id', body);
    return res.status(400).send('missing sale id');
  }

  const updated = await applyPayMeCallbackToPayment({
    paymeSaleId: parsed.paymeSaleId,
    paymeTransactionId: parsed.paymeTransactionId,
    localStatus: parsed.localStatus,
    internalTransactionId: parsed.transactionId,
  });

  if (!updated) {
    logger.warn(
      `[PayMe callback] No local row matched payme_sale_id=${parsed.paymeSaleId} transaction_id=${parsed.transactionId}`,
    );
  }

  return res.status(200).send('OK');
}

/** @deprecated — use handlePayMeCallback; kept for legacy webhook route */
export async function handlePayMeWebhookRequest(req, res) {
  let body = {};
  if (Buffer.isBuffer(req.body)) {
    try {
      const text = req.body.toString('utf8');
      const params = new URLSearchParams(text);
      for (const [k, v] of params) body[k] = v;
    } catch {
      try {
        body = JSON.parse(req.body.toString('utf8') || '{}');
      } catch {
        body = {};
      }
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }
  req.body = body;
  return handlePayMeCallback(req, res);
}
