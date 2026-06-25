/**
 * PayPal REST v2 (Orders) — server-side only.
 * Credentials: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
 * Base URL: PAYPAL_API_BASE (default = Sandbox api-m.sandbox.paypal.com)
 */

import https from 'node:https';

const DEFAULT_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const DEFAULT_LIVE_BASE = 'https://api-m.paypal.com';

/** מסיר רווחים, BOM, תווים בלתי־נראים ומירכאות שגויות מסביב לערך מ־.env */
function cleanEnvValue(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).replace(/^\uFEFF/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** קורא משתנה גם אם שם המפתח ב־.env נשמר עם רווחים (למשל `PAYPAL_CLIENT_ID =...`) */
function readEnvTrimmedKey(canonicalName) {
  const direct = cleanEnvValue(process.env[canonicalName]);
  if (direct) return direct;
  const looseKey = Object.keys(process.env).find((k) => k.trim() === canonicalName);
  return looseKey ? cleanEnvValue(process.env[looseKey]) : '';
}

/** האם רצים על פלטפורמת ענן ידועה (שם אסור לעקוף TLS גם אם מישהו הגדיר דגל בטעות) */
function runningOnKnownCloudHost() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.VERCEL ||
      process.env.FLY_APP_NAME ||
      process.env.RENDER,
  );
}

/** עקיפת אימות TLS ל־PayPal (https עם rejectUnauthorized:false). */
function payPalTlsInsecureEnabled() {
  const v = readEnvTrimmedKey('PAYPAL_TLS_INSECURE').toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  const nodeProd = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const onCloud = runningOnKnownCloudHost();

  if (v === 'true' || v === '1' || v === 'yes') {
    if (nodeProd && onCloud) return false;
    return true;
  }

  // אין ערך מפורש: בענן — לא עוקפים; production מקומי — לא (חובה true במפורש); אחרת — כן (פיתוח טיפוסי / Windows + אנטי־וירוס)
  if (onCloud) return false;
  if (nodeProd) return false;
  return true;
}

let payPalTlsInsecureWarned = false;

function warnPayPalTlsInsecureOnce() {
  if (!payPalTlsInsecureEnabled() || payPalTlsInsecureWarned) return;
  payPalTlsInsecureWarned = true;
  console.warn(
    '[PayPal] חיבור ל־PayPal בלי אימות תעודת TLS (rejectUnauthorized=false). מצב: PAYPAL_TLS_INSECURE או ברירת מחדל לפיתוח מקומי. כבו ב־PAYPAL_TLS_INSECURE=false או השתמשו ב־NODE_EXTRA_CA_CERTS.',
  );
}

/** תשובה תואמת־fetch מינימלית */
function paypalHttpsInsecure(url, { method = 'GET', headers = {}, body } = {}) {
  const u = new URL(url);
  if (u.protocol !== 'https:') {
    return Promise.reject(new Error('PayPal: רק https'));
  }
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method,
        headers: { ...headers },
        rejectUnauthorized: false,
      },
      (incoming) => {
        const chunks = [];
        incoming.on('data', (d) => chunks.push(d));
        incoming.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = incoming.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => text,
          });
        });
      },
    );
    req.on('error', reject);
    if (body != null && body !== '') req.write(typeof body === 'string' ? body : String(body));
    req.end();
  });
}

async function paypalFetch(url, init) {
  if (payPalTlsInsecureEnabled()) {
    warnPayPalTlsInsecureOnce();
    return paypalHttpsInsecure(url, {
      method: init?.method || 'GET',
      headers: init?.headers || {},
      body: init?.body,
    });
  }
  return fetch(url, init);
}

function hintPayPalTlsIfFetchFailed(message) {
  if (payPalTlsInsecureEnabled()) return '';
  const m = String(message || '');
  if (/fetch failed|unable_to_verify|certificate|UNABLE_TO_VERIFY|SSL/i.test(m)) {
    return ' — TLS: אם זה שרת production מקומי, הגדירו PAYPAL_TLS_INSECURE=true ב-server/.env. לכיבוי עקיפה: PAYPAL_TLS_INSECURE=false. מדריך: docs/PAYMENT_ENV.md';
  }
  return '';
}

function resolvePayPalMode() {
  const explicit = readEnvTrimmedKey('PAYPAL_MODE').toLowerCase();
  if (explicit === 'live' || explicit === 'production') return 'live';
  if (explicit === 'sandbox' || explicit === 'test') return 'sandbox';
  const base = readEnvTrimmedKey('PAYPAL_API_BASE').toLowerCase();
  if (base.includes('sandbox')) return 'sandbox';
  if (base.includes('api-m.paypal.com')) return 'live';
  return 'sandbox';
}

function getApiBase() {
  const raw = readEnvTrimmedKey('PAYPAL_API_BASE');
  if (raw) return raw;
  return resolvePayPalMode() === 'live' ? DEFAULT_LIVE_BASE : DEFAULT_SANDBOX_BASE;
}

/** לבדיקת `/api/health` — בלי חשיפת ערכים */
export function getPayPalEnvStatus() {
  const id = readEnvTrimmedKey('PAYPAL_CLIENT_ID');
  const secret = readEnvTrimmedKey('PAYPAL_CLIENT_SECRET');
  const mode = resolvePayPalMode();
  const configured = Boolean(id && secret);
  const missing = [];
  if (!id) missing.push('PAYPAL_CLIENT_ID');
  if (!secret) missing.push('PAYPAL_CLIENT_SECRET');

  return {
    configured,
    hasClientId: Boolean(id),
    hasClientSecret: Boolean(secret),
    mode,
    apiBase: getApiBase(),
    /** true רק בפיתוח כש־PAYPAL_TLS_INSECURE מופעל */
    tlsInsecureDev: payPalTlsInsecureEnabled(),
    missing,
    setupHint: configured
      ? null
      : 'Railway: הוסיפו PAYPAL_CLIENT_ID ו-PAYPAL_CLIENT_SECRET (אותה אפליקציה כמו VITE_PAYPAL_CLIENT_ID ב-Vercel).',
  };
}

export function logPayPalStartup() {
  const s = getPayPalEnvStatus();
  if (s.configured) {
    console.info(`[PayPal] מוכן (${s.mode}) → ${s.apiBase}`);
    return;
  }
  console.warn(
    `[PayPal] לא מוגדר: חסרים ${s.missing.join(', ') || 'משתני סביבה'}. ${s.setupHint} GET /api/health → paypal.`,
  );
}

function requireCredentials() {
  const id = readEnvTrimmedKey('PAYPAL_CLIENT_ID');
  const secret = readEnvTrimmedKey('PAYPAL_CLIENT_SECRET');
  if (!id || !secret) {
    const err = new Error(
      'PayPal לא מוגדר בשרת: הגדירו PAYPAL_CLIENT_ID ו־PAYPAL_CLIENT_SECRET ב־server/.env והפעילו מחדש את השרת.',
    );
    err.statusCode = 503;
    throw err;
  }
  return { id, secret };
}

function paypalErrorMessage(status, bodyText, context) {
  let detail = bodyText.slice(0, 400);
  try {
    const j = JSON.parse(bodyText);
    const code = j.error;
    const desc = j.error_description || '';
    if (status === 401 && (code === 'invalid_client' || desc.includes('Client Authentication'))) {
      return `${context}: PayPal דחה את האימות (Client ID / Secret). ודאו ששניהם מאותה אפליקציה בדיוק (בדרך כלל Sandbox), בלי רווח אחרי =, בלי מירכאות מיותרות, שה־Secret עודכן מ־"Show" בדשבורד, והפעילו מחדש את שרת Node.`;
    }
    if (code === 'invalid_request') {
      return `${context}: ${desc || detail}`;
    }
  } catch {
    /* לא JSON */
  }
  return `${context} (${status}): ${detail}`;
}

async function getAccessToken() {
  try {
    const { id, secret } = requireCredentials();
    const base = getApiBase();
    const auth = Buffer.from(`${id}:${secret}`, 'utf8').toString('base64');
    const res = await paypalFetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'אימות מול PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    const json = JSON.parse(text);
    if (!json.access_token) {
      const err = new Error('PayPal לא החזיר access_token לאחר אימות.');
      err.statusCode = 502;
      throw err;
    }
    return json.access_token;
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (קבלת אסימון): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

/**
 * @param {{ currency_code: string, value: string }} purchaseUnitAmount
 * @returns {Promise<object>} PayPal order resource (includes `id`)
 */
export async function paypalCreateOrder(purchaseUnitAmount, { intent = 'CAPTURE' } = {}) {
  const normalizedIntent = String(intent).toUpperCase() === 'AUTHORIZE' ? 'AUTHORIZE' : 'CAPTURE';
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const res = await paypalFetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: normalizedIntent,
        purchase_units: [
          {
            amount: {
              currency_code: purchaseUnitAmount.currency_code,
              value: purchaseUnitAmount.value,
            },
          },
        ],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'יצירת הזמנה ב־PayPal נכשלה');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (יצירת הזמנה): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

export async function paypalAuthorizeOrder(orderID) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(orderID);
    const res = await paypalFetch(`${base}/v2/checkout/orders/${id}/authorize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'אישור תשלום ב־PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (אישור תשלום): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

/**
 * @param {string} orderID
 * @returns {Promise<object>} PayPal capture response
 */
export async function paypalCaptureOrder(orderID) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(orderID);
    const res = await paypalFetch(`${base}/v2/checkout/orders/${id}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'סיום חיוב ב־PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (סיום חיוב): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

/**
 * @param {string} captureId
 * @returns {Promise<object>} PayPal capture details
 */
export async function paypalGetCapture(captureId) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(captureId);
    const res = await paypalFetch(`${base}/v2/payments/captures/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'אימות תשלום PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (אימות חיוב): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

export async function paypalGetAuthorization(authorizationId) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(authorizationId);
    const res = await paypalFetch(`${base}/v2/payments/authorizations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'אימות אישור תשלום PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (אימות אישור): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

export async function paypalCaptureAuthorization(authorizationId) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(authorizationId);
    const res = await paypalFetch(`${base}/v2/payments/authorizations/${id}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'חיוב בפועל ב־PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (חיוב בפועל): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}

export async function paypalVoidAuthorization(authorizationId) {
  try {
    const token = await getAccessToken();
    const base = getApiBase();
    const id = encodeURIComponent(authorizationId);
    const res = await paypalFetch(`${base}/v2/payments/authorizations/${id}/void`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.status === 204) return { voided: true };
    const text = await res.text();
    if (!res.ok) {
      const msg = paypalErrorMessage(res.status, text, 'ביטול אישור תשלום ב־PayPal נכשל');
      const err = new Error(msg);
      err.statusCode = 502;
      throw err;
    }
    return text ? JSON.parse(text) : { voided: true };
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`PayPal (ביטול אישור): ${e.message}${hintPayPalTlsIfFetchFailed(e.message)}`);
    err.statusCode = 502;
    throw err;
  }
}
