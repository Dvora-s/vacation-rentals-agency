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

const DEFAULT_SANDBOX_BASE = 'https://sandbox.payme.io/api';

/**
 * @returns {{
 *   baseUrl: string,
 *   apiKey: string | undefined,
 *   merchantId: string | undefined,
 *   generatePaymentPath: string,
 * }}
 */
export function getPayMeConfig() {
  const baseUrl = String(process.env.PAYME_BASE_URL || DEFAULT_SANDBOX_BASE)
    .trim()
    .replace(/\/+$/, '');
  return {
    baseUrl,
    apiKey: optionalTrim(process.env.PAYME_API_KEY),
    merchantId: optionalTrim(process.env.PAYME_MERCHANT_ID),
    generatePaymentPath: String(process.env.PAYME_GENERATE_PAYMENT_PATH || '/generate-payment').trim(),
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
    configured: Boolean(c.apiKey),
    hasBaseUrl: Boolean(c.baseUrl),
    hasApiKey: Boolean(c.apiKey),
    hasMerchantId: Boolean(c.merchantId),
    generatePaymentPath: c.generatePaymentPath,
    apiPublicBase: getApiPublicBaseUrl(),
  };
}

/**
 * Throws if PayMe is not minimally configured for outbound API calls.
 */
export function assertPayMeConfiguredForApi() {
  const c = getPayMeConfig();
  if (!c.apiKey) {
    const err = new Error('PAYME_API_KEY is not configured');
    err.code = 'PAYME_CONFIG';
    throw err;
  }
  if (!c.baseUrl) {
    const err = new Error('PAYME_BASE_URL is not configured');
    err.code = 'PAYME_CONFIG';
    throw err;
  }
}
