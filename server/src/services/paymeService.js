import { assertPayMeConfiguredForApi, getApiPublicBaseUrl, getPayMeConfig } from '../config/payme.js';
import { logger } from '../utils/logger.js';

/**
 * Low-level PayMe HTTP call (Node 18+ fetch).
 */
async function paymeRequest(path, { method = 'POST', body } = {}) {
  assertPayMeConfiguredForApi();
  const { baseUrl } = getPayMeConfig();

  let url;
  if (/^https?:\/\//i.test(path)) {
    url = path;
  } else {
    const base = String(baseUrl).replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    url = `${base}${p}`;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    const err = new Error(
      `כתובת PayMe לא תקינה: ${url}. בדקו PAYME_BASE_URL ב-Railway (צריך להיות ${baseUrl}).`,
    );
    err.code = 'PAYME_CONFIG';
    throw err;
  }

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
  if (error instanceof TypeError && /parse URL/i.test(error.message)) {
    return {
      status: 503,
      message:
        'כתובת PayMe לא תקינה. הגדירו PAYME_BASE_URL=https://sandbox.payme.io/api ב-Railway (ללא רווחים / תווים מיותרים).',
      code: 'PAYME_CONFIG',
      context,
    };
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
function isSellerNotFound(data) {
  const details = String(
    (data && typeof data === 'object' && (data.status_error_details || data.message || data.error)) ||
      '',
  );
  return /מוכר לא נמצא|seller not found|merchant not found/i.test(details);
}

function buildSalePayload({ sellerId, apiKey, input, notifyUrl }) {
  /** @type {Record<string, unknown>} */
  const payload = {
    seller_payme_id: sellerId,
    sale_price: Math.round(Number(input.priceAgorot)),
    currency: String(input.currency || 'ILS').toUpperCase(),
    product_name: String(input.productName || 'Payment').slice(0, 500),
    installments: 1,
    sale_callback_url: notifyUrl,
    capture_buyer: 0,
  };
  if (apiKey) payload.payme_key = apiKey;
  if (input.transactionId) payload.transaction_id = String(input.transactionId);
  if (input.returnUrl) payload.sale_return_url = input.returnUrl;
  return payload;
}

function parseGenerateSaleResponse(data) {
  const statusCode = Number(data.status_code);
  if (statusCode === 1) {
    const err = new Error(String(data.status_error_details || 'PayMe generate-sale error'));
    err.code = 'PAYME_PARSE';
    err.paymeRaw = data;
    throw err;
  }

  const paymeSaleId =
    data.payme_sale_id || data.sale_id || data.data?.payme_sale_id || data.data?.sale_id;

  if (!paymeSaleId) {
    const err = new Error('PayMe response missing payme_sale_id');
    err.code = 'PAYME_PARSE';
    err.paymeRaw = data;
    throw err;
  }

  const saleUrl = data.sale_url || data.payment_url || data.checkout_url;
  return {
    paymeSaleId: String(paymeSaleId),
    saleUrl: saleUrl ? String(saleUrl) : undefined,
    raw: data,
  };
}

export async function generatePaymentSession(input) {
  const { apiKey, merchantId, generatePaymentPath, baseUrl } = getPayMeConfig();
  const notifyUrl = input.notifyUrl || `${getApiPublicBaseUrl()}/api/payments/callback`;

  // Candidate seller ids: configured merchant first, then API key (common swap / single-credential accounts).
  const sellerCandidates = [...new Set([merchantId, apiKey].filter(Boolean))];

  let lastError = null;
  for (const sellerId of sellerCandidates) {
    const payload = buildSalePayload({ sellerId, apiKey, input, notifyUrl });
    const res = await paymeRequest(generatePaymentPath, { method: 'POST', body: payload });

    // HTTP-level failure
    if (res.status < 200 || res.status >= 300) {
      lastError = new Error(`PayMe generate-sale failed (${res.status})`);
      lastError.response = { status: res.status, data: res.data };
      continue;
    }

    const data = /** @type {Record<string, unknown>} */ (
      typeof res.data === 'object' && res.data !== null ? res.data : {}
    );

    if (isSellerNotFound(data)) {
      logger.warn('[PayMe] seller not found for candidate', {
        sellerPrefix: String(sellerId).slice(0, 4),
        baseUrl,
        path: generatePaymentPath,
      });
      lastError = new Error(String(data.status_error_details || 'מוכר לא נמצא'));
      lastError.code = 'PAYME_PARSE';
      lastError.paymeRaw = data;
      continue;
    }

    try {
      return parseGenerateSaleResponse(data);
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (lastError) {
    if (isSellerNotFound(lastError.paymeRaw || {}) || /מוכר לא נמצא/i.test(String(lastError.message))) {
      const err = new Error(
        `מוכר לא נמצא ב-PayMe (${baseUrl}). בדקו ש-PAYME_MERCHANT_ID הוא ה-seller_payme_id מחשבון Production (לרוב מתחיל ב-MPL), וש-PAYME_API_KEY מאותו חשבון. אם השדות הוחלפו ב-Railway — החליפו ביניהם.`,
      );
      err.code = 'PAYME_PARSE';
      throw err;
    }
    throw lastError;
  }

  const err = new Error('PayMe generate-sale failed with no candidates');
  err.code = 'PAYME_CONFIG';
  throw err;
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
