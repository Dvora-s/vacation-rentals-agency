import { v2 as cloudinary } from 'cloudinary';

let configured = false;
/** @type {boolean | null} */
let lastVerifyOk = null;
/** @type {string | null} */
let lastVerifyError = null;

/** מסיר BOM, רווחים, מירכאות ותווים בלתי־נראים מערכי .env */
function cleanEnvValue(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).replace(/^\uFEFF/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Cloud name אמיתי מ-Account Details — לא שם תיקייה ב-Media Library */
function isPlausibleCloudName(name) {
  const n = cleanEnvValue(name);
  if (!n) return false;
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(n)) return false;
  const lower = n.toLowerCase();
  if (lower === 'root' || lower === 'home' || lower === 'media library') return false;
  return true;
}

function cloudNameMisconfigHint(name) {
  const n = cleanEnvValue(name);
  if (n.toLowerCase() === 'root') {
    return (
      'CLOUDINARY_CLOUD_NAME="Root" הוא שם תיקייה בממשק, לא Cloud name. ' +
      'ב-Cloudinary Dashboard → Account Details העתיקי את השדה "Cloud name" (למשל dxxxxxx).'
    );
  }
  return (
    'ודאו ש-CLOUDINARY_CLOUD_NAME הוא "Cloud name" מ-Account Details, ' +
    'וש-CLOUDINARY_API_KEY ו-CLOUDINARY_API_SECRET תואמים לאותו חשבון.'
  );
}

/** קורא פעם אחת בעליית השרת — CLOUDINARY_URL או שלושה משתנים נפרדים. */
export function configureCloudinary() {
  if (configured) return isCloudinaryConfigured();

  const url = cleanEnvValue(process.env.CLOUDINARY_URL);
  if (url) {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
    if (match) {
      const cloud_name = decodeURIComponent(match[3]);
      if (!isPlausibleCloudName(cloud_name)) {
        console.warn(`[uploads] CLOUDINARY_URL cloud name "${cloud_name}" נראה שגוי. ${cloudNameMisconfigHint(cloud_name)}`);
      }
      cloudinary.config({
        api_key: decodeURIComponent(match[1]),
        api_secret: decodeURIComponent(match[2]),
        cloud_name,
        secure: true,
      });
      configured = true;
      return true;
    }
    console.warn('[uploads] CLOUDINARY_URL is set but could not be parsed');
  }

  const cloud_name = cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const api_key = cleanEnvValue(process.env.CLOUDINARY_API_KEY);
  const api_secret = cleanEnvValue(process.env.CLOUDINARY_API_SECRET);

  if (cloud_name && api_key && api_secret) {
    if (!isPlausibleCloudName(cloud_name)) {
      console.warn(`[uploads] CLOUDINARY_CLOUD_NAME="${cloud_name}" נראה שגוי. ${cloudNameMisconfigHint(cloud_name)}`);
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
    return true;
  }

  configured = true;
  return false;
}

export function isCloudinaryConfigured() {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

export function getCloudinaryFolder() {
  return cleanEnvValue(process.env.CLOUDINARY_FOLDER) || 'dirotnofesh/apartments';
}

export function getUploadProvider() {
  return isCloudinaryConfigured() ? 'cloudinary' : 'local';
}

/** ל-/api/health — בלי לחשוף סודות */
export function getCloudinaryDiagnostics() {
  const c = cloudinary.config();
  const hasUrl = Boolean(cleanEnvValue(process.env.CLOUDINARY_URL));
  const hasParts = Boolean(
    cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME) &&
      cleanEnvValue(process.env.CLOUDINARY_API_KEY) &&
      cleanEnvValue(process.env.CLOUDINARY_API_SECRET),
  );
  const cloudName = c.cloud_name || null;

  return {
    provider: getUploadProvider(),
    configured: isCloudinaryConfigured(),
    verified: lastVerifyOk,
    verify_error: lastVerifyError,
    cloud_name: cloudName,
    cloud_name_plausible: cloudName ? isPlausibleCloudName(cloudName) : false,
    folder: getCloudinaryFolder(),
    config_source: hasUrl ? 'CLOUDINARY_URL' : hasParts ? 'CLOUDINARY_*' : 'none',
    setup_hint:
      cloudName && !isPlausibleCloudName(cloudName)
        ? cloudNameMisconfigHint(cloudName)
        : lastVerifyError || null,
  };
}

/** בדיקת חיבור אמיתית ל-Cloudinary (תופס cloud_name שגוי כמו "Root"). */
export async function verifyCloudinaryOnStartup() {
  lastVerifyOk = null;
  lastVerifyError = null;

  if (!isCloudinaryConfigured()) {
    lastVerifyOk = false;
    lastVerifyError = 'not_configured';
    return false;
  }

  const c = cloudinary.config();
  if (!isPlausibleCloudName(c.cloud_name)) {
    lastVerifyOk = false;
    lastVerifyError = cloudNameMisconfigHint(c.cloud_name);
    console.error(`[uploads] Cloudinary: ${lastVerifyError}`);
    return false;
  }

  try {
    await cloudinary.api.ping();
    lastVerifyOk = true;
    return true;
  } catch (e) {
    lastVerifyOk = false;
    lastVerifyError = e?.message || String(e);
    console.error(
      `[uploads] Cloudinary ping failed (cloud=${c.cloud_name}): ${lastVerifyError}. ${cloudNameMisconfigHint(c.cloud_name)}`,
    );
    return false;
  }
}

export function logCloudinaryStartup() {
  const d = getCloudinaryDiagnostics();
  if (d.configured) {
    console.info(`[uploads] Cloudinary configured: cloud=${d.cloud_name} folder=${d.folder}`);
    return;
  }
  console.warn(
    '[uploads] Cloudinary not configured — images saved to local disk (lost on Railway redeploy). Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET on Railway.',
  );
}

export function formatCloudinaryUploadError(err) {
  const msg = err?.message || String(err);
  if (/invalid cloud_name/i.test(msg)) {
    const d = getCloudinaryDiagnostics();
    return `הגדרות Cloudinary שגויות (cloud_name="${d.cloud_name || '?'}"). ${cloudNameMisconfigHint(d.cloud_name || 'Root')}`;
  }
  return 'העלאת התמונות לענן נכשלה. בדקו את הגדרות Cloudinary בשרת (Railway → Variables).';
}

export { cloudinary };
