const API_ORIGIN = (
  process.env.PUBLIC_API_URL ||
  process.env.APP_URL ||
  'http://localhost:5000'
)
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

/** ממיר נתיב יחסי (/uploads/...) לכתובת מלאה לתצוגה בדפדפן */
export function absoluteMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `${API_ORIGIN}${s.startsWith('/') ? s : `/${s}`}`;
}
