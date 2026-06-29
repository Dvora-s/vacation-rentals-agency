const DEFAULT_API_BASE = 'https://vacation-rentals-agency-production.up.railway.app/api';

function normalizeApiBase(raw) {
  let base = String(raw).trim();
  if (base === '/api' || base.startsWith('/api/')) {
    return '/api';
  }
  base = base.replace(/\/+$/, '');
  if (base.includes('/api/')) {
    base = `${base.split('/api/')[0]}/api`;
  } else if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}

/** Ensures API base always ends with `/api` (Vercel env sometimes omits it). */
export function getApiBase() {
  const raw =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
  return normalizeApiBase(raw);
}

/**
 * בסיס ל-API של העלאת תמונות.
 * ב-Vercel הפרוקסי /api מגביל גוף בקשה (~4.5MB) — מעלים ישירות ל-Railway.
 */
export function getUploadApiBase() {
  const uploadOverride =
    import.meta.env.VITE_UPLOAD_API_URL || import.meta.env.VITE_UPLOAD_API_BASE;
  if (uploadOverride) {
    return normalizeApiBase(uploadOverride);
  }

  const apiBase = getApiBase();
  if (apiBase === '/api') {
    return DEFAULT_API_BASE;
  }
  return apiBase;
}
