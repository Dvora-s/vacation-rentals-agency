import { getApiBase } from '../config/apiBase.js';

const API_ORIGIN = getApiBase().replace(/\/api\/?$/, '');

/** ממיר נתיב יחסי (/uploads/...) לכתובת מלאה לתצוגה בדפדפן */
export function resolveMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return `${API_ORIGIN}${s.startsWith('/') ? s : `/${s}`}`;
}

/** כתובת תמונת הכריכה של דירה לתצוגה בכרטיסים */
export function getApartmentCoverUrl(apartment) {
  if (!apartment) return null;
  const raw =
    apartment.image ||
    apartment.image_url ||
    (Array.isArray(apartment.images) && apartment.images.find(Boolean)) ||
    null;
  return resolveMediaUrl(raw);
}
