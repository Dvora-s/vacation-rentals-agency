import { getApiBase } from '../config/apiBase.js';

const API_ORIGIN = getApiBase().replace(/\/api\/?$/, '');

/** ממיר נתיב יחסי (/uploads/...) לכתובת מלאה לתצוגה בדפדפן */
export function resolveMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `${API_ORIGIN}${s.startsWith('/') ? s : `/${s}`}`;
}
