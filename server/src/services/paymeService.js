import { assertPayMeConfiguredForApi, getApiPublicBaseUrl, getPayMeConfig } from '../config/payme.js';
import { logger } from '../utils/logger.js';

/**
 * Low-level PayMe HTTP call (Node 18+ fetch).
 */
async function paymeRequest(path, { method = 'POST', body } = {}) {
  assertPayMeConfiguredForApi();
  const { baseUrl } = getPayMeConfig();
  const base = String(baseUrl).replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${p}`;
  const timeoutMs = Number(process.env.PAYME_HTTP_TIMEOUT_MS) || 20000;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    });
    const text = await res.text();
    let data = /** @type {unknown} */ (text);
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        /* leave as raw string */
      }
    }
    return { status: res.status, data };
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
      const e = new Error('PayMe request timed out');
      e.code = 'PAYME_TIMEOUT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function throwIfNotOk(responseLike, label) {
  const { status, data } = responseLike;
  if (status >= 200 && status < 300) return;

  const err = new Error(`${label} failed (${status})`);
  err.response = { status, data };
  throw err;
}

/**
 * @param {unknown} error
 * @param {string} context
 */
export function normalizePayMeError(error, context = 'payme') {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'PAYME_CONFIG') {
    return { status: 503, message: String(error.message), code: 'PAYME_CONFIG' };
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 'PAYME_PARSE') {
    return { status: 502, message: String(error.message), code: 'PAYME_PARSE' };
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 'PAYME_TIMEOUT') {
    return { status: 504, message: String(error.message), code: 'PAYME_TIMEOUT', context };
  }
  if (error && typeof error === 'object' && 'response' in error && error.response) {
    const r = /** @type {{ status?: number, data?: unknown }} */ (error.response);
    const status = typeof r.status === 'number' ? r.status : 502;
    const body = r.data;
    let msg = `PayMe request failed (${status})`;
    if (typeof body === 'object' && body !== null) {
      const o = /** @type {{ message?: unknown, error?: unknown, status_error_details?: unknown }} */ (body);
      if (o.status_error_details != null) msg = String(o.status_error_details);
      else if (o.message != null) msg = String(o.message);
      else if (o.error != null) msg = String(o.error);
    } else if (typeof body === 'string' && body.trim()) {
      msg = body.trim();
    }
    return {
      status: status >= 400 ? status : 502,
      message: String(msg),
      code: 'PAYME_HTTP',
      context,
    };
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Unexpected PayMe error',
    code: 'PAYME_UNKNOWN',
    context,
  };
}

/**
 * Call PayMe "Generate Payment" API (iFrame / Hosted Fields — Option 2).
 *
 * @param {object} input
 * @param {number} input.priceAgorot — price in agorot (10000 = 100 ILS)
 * @param {string} input.currency
 * @param {string} input.productName
 * @param {string} [input.transactionId] — internal correlation id
 * @param {string} [input.notifyUrl] — IPN callback (sale_callback_url)
 * @param {string} [input.returnUrl] — buyer redirect after success
 * @returns {Promise<{ paymeSaleId: string, saleUrl?: string, raw: unknown }>}
 */
export async function generatePaymentSession(input) {
  const { apiKey, merchantId, generatePaymentPath } = getPayMeConfig();
  const notifyUrl = input.notifyUrl || `${getApiPublicBaseUrl()}/api/payments/callback`;

  /** @type {Record<string, unknown>} */
  const payload = {
    payme_key: apiKey,
    sale_price: Math.round(Number(input.priceAgorot)),
    currency: String(input.currency || 'ILS').toUpperCase(),
    product_name: String(input.productName || 'Payment').slice(0, 500),
    installments: 1,
    sale_callback_url: notifyUrl,
    capture_buyer: 0,
  };

  if (merchantId) {
    payload.seller_payme_id = merchantId;
  }
  if (input.transactionId) {
    payload.transaction_id = String(input.transactionId);
  }
  if (input.returnUrl) {
    payload.sale_return_url = input.returnUrl;
  }

  const res = await paymeRequest(generatePaymentPath, { method: 'POST', body: payload });
  throwIfNotOk(res, 'PayMe generate-payment');

  const data = /** @type {Record<string, unknown>} */ (
    typeof res.data === 'object' && res.data !== null ? res.data : {}
  );

  const statusCode = Number(data.status_code);
  if (statusCode === 1) {
    const err = new Error(String(data.status_error_details || 'PayMe generate-payment error'));
    err.code = 'PAYME_PARSE';
    throw err;
  }

  const paymeSaleId =
    data.payme_sale_id || data.sale_id || data.data?.payme_sale_id || data.data?.sale_id;

  if (!paymeSaleId) {
    const err = new Error('PayMe response missing payme_sale_id');
    err.code = 'PAYME_PARSE';
    throw err;
  }

  const saleUrl = data.sale_url || data.payment_url || data.checkout_url;

  return {
    paymeSaleId: String(paymeSaleId),
    saleUrl: saleUrl ? String(saleUrl) : undefined,
    raw: data,
  };
}

/**
 * Parse PayMe IPN callback body (x-www-form-urlencoded → plain object).
 * @param {Record<string, unknown>} body
 */
export function parsePayMeCallback(body) {
  const statusCode = Number(body.status_code);
  const saleStatus = String(body.sale_status || '').toLowerCase();
  const notifyType = String(body.notify_type || '').toLowerCase();
  const paymeSaleId = body.payme_sale_id != null ? String(body.payme_sale_id) : '';
  const paymeTransactionId =
    body.payme_transaction_id != null ? String(body.payme_transaction_id) : '';

  const isPaid =
    statusCode === 0 &&
    (saleStatus === 'completed' ||
      notifyType === 'sale-complete' ||
      notifyType === 'sale-authorized');

  const isFailed =
    statusCode === 1 ||
    saleStatus === 'failed' ||
    notifyType === 'sale-failure';

  let localStatus = 'pending';
  if (isPaid) localStatus = 'paid';
  else if (isFailed) localStatus = 'failed';

  return {
    statusCode,
    saleStatus,
    notifyType,
    paymeSaleId,
    paymeTransactionId,
    localStatus,
    transactionId: body.transaction_id != null ? String(body.transaction_id) : undefined,
    priceAgorot: body.price != null ? Number(body.price) : undefined,
    currency: body.currency != null ? String(body.currency) : undefined,
    raw: body,
  };
}

/**
 * Map PayMe remote status strings to our DB status values.
 * @param {string} remoteStatus
 */
export function mapRemoteStatusToLocal(remoteStatus) {
  const s = String(remoteStatus || '').toLowerCase();
  if (['paid', 'completed', 'success', 'captured', 'approved'].includes(s)) return 'paid';
  if (['pending', 'processing', 'created', 'initialized', 'initial'].includes(s)) return 'pending';
  if (['failed', 'declined', 'error', 'canceled', 'cancelled', 'voided'].includes(s)) return 'failed';
  if (['refunded', 'partially_refunded', 'partial-refund'].includes(s)) return 'refunded';
  return 'pending';
}

/**
 * Log callback payload (mock persistence — also updates DB via controller).
 * @param {ReturnType<typeof parsePayMeCallback>} parsed
 */
export function logPayMeCallback(parsed) {
  logger.info('[PayMe IPN]', {
    paymeSaleId: parsed.paymeSaleId,
    paymeTransactionId: parsed.paymeTransactionId,
    localStatus: parsed.localStatus,
    notifyType: parsed.notifyType,
    saleStatus: parsed.saleStatus,
    transactionId: parsed.transactionId,
  });
}
