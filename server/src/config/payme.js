/**
 * PayMe configuration (server-side only).
 * Never import this module from client-side code or expose values to the browser.
 *
 * Required:
 * - PAYME_API_KEY — sent as `payme_key` in Generate Payment requests.
 *
 * Optional:
 * - PAYME_BASE_URL — API base (default sandbox). No trailing slash.
 * - PAYME_MERCHANT_ID — seller_payme_id when PayMe requires it in addition to payme_key.
 * - API_PUBLIC_URL — public backend URL for notify_url (IPN callback).
 */

/** Production by default (user request). Sandbox: https://sandbox.payme.io/api */
const DEFAULT_LIVE_BASE = 'https://live.payme.io/api';
const DEFAULT_GENERATE_PATH = '/generate-sale';

function normalizeBaseUrl(raw) {
  let s = optionalTrim(raw);
  if (!s) s = DEFAULT_LIVE_BASE;
  s = s.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, '')}`;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(s);
  } catch {
    const err = new Error(
      `PAYME_BASE_URL לא תקין (${JSON.stringify(raw)}). השתמשו ב: ${DEFAULT_LIVE_BASE}`,
    );
    err.code = 'PAYME_CONFIG';
    throw err;
  }
  return s;
}

function normalizeGeneratePath(raw) {
  const s = String(raw || DEFAULT_GENERATE_PATH).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

/**
 * @returns {{
 *   baseUrl: string,
 *   apiKey: string | undefined,
 *   merchantId: string | undefined,
 *   generatePaymentPath: string,
 * }}
 */
export function getPayMeConfig() {
  const baseUrl = normalizeBaseUrl(process.env.PAYME_BASE_URL);
  return {
    baseUrl,
    apiKey: optionalTrim(process.env.PAYME_API_KEY),
    merchantId: optionalTrim(process.env.PAYME_MERCHANT_ID),
    generatePaymentPath: normalizeGeneratePath(
      process.env.PAYME_GENERATE_PAYMENT_PATH || process.env.PAYME_CREATE_PAYMENT_PATH,
    ),
  };
}

function optionalTrim(v) {
  if (v === undefined || v === null) return undefined;
  let s = String(v).replace(/^\uFEFF/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/[^\x20-\x7E]/g, '');
  return s === '' ? undefined : s;
}

/**
 * Public API base used for PayMe notify_url (IPN).
 */
export function getApiPublicBaseUrl() {
  const explicit = optionalTrim(process.env.API_PUBLIC_URL);
  if (explicit) return explicit.replace(/\/+$/, '');

  const railway = optionalTrim(process.env.RAILWAY_PUBLIC_DOMAIN);
  if (railway) return `https://${railway.replace(/^https?:\/\//, '')}`;

  const port = Number(process.env.PORT) || 5000;
  return `http://localhost:${port}`;
}

/**
 * Non-secret status for health checks / ops (never returns key material).
 */
export function getPayMeEnvStatus() {
  const c = getPayMeConfig();
  return {
    configured: Boolean(c.merchantId && c.apiKey),
    baseUrl: c.baseUrl,
    hasBaseUrl: Boolean(c.baseUrl),
    hasApiKey: Boolean(c.apiKey),
    apiKeyPrefix: c.apiKey ? c.apiKey.slice(0, 4) : null,
    apiKeyLength: c.apiKey ? c.apiKey.length : 0,
    hasMerchantId: Boolean(c.merchantId),
    merchantIdPrefix: c.merchantId ? c.merchantId.slice(0, 4) : null,
    merchantIdLength: c.merchantId ? c.merchantId.length : 0,
    sameKeyAndMerchant: Boolean(c.apiKey && c.merchantId && c.apiKey === c.merchantId),
    generatePaymentPath: c.generatePaymentPath,
    apiPublicBase: getApiPublicBaseUrl(),
  };
}

/**
 * Throws if PayMe is not minimally configured for outbound API calls.
 * PayMe Generate Sale requires seller_payme_id (PAYME_MERCHANT_ID).
 */
export function assertPayMeConfiguredForApi() {
  const c = getPayMeConfig();
  if (!c.baseUrl) {
    const err = new Error('PAYME_BASE_URL is not configured');
    err.code = 'PAYME_CONFIG';
    throw err;
  }
  if (!c.merchantId) {
    const err = new Error(
      'מוכר לא נמצא — חסר PAYME_MERCHANT_ID. העתיקו מ-PayMe Dashboard → Settings את seller_payme_id (מזהה הסוחר) ל-Railway.',
    );
    err.code = 'PAYME_CONFIG';
    throw err;
  }
  if (!c.apiKey) {
    // Some accounts use seller_payme_id only; still recommend PAYME_API_KEY when available.
    const err = new Error(
      'חסר PAYME_API_KEY. העתיקו את ה-API Key מ-PayMe Dashboard → Settings ל-Railway.',
    );
    err.code = 'PAYME_CONFIG';
    throw err;
  }
}
