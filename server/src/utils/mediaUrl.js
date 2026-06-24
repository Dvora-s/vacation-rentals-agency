function resolveApiOrigin() {
  const fromPublic = process.env.PUBLIC_API_URL || process.env.API_URL;
  if (fromPublic) {
    return String(fromPublic).replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${String(process.env.RAILWAY_PUBLIC_DOMAIN).replace(/\/$/, '')}`;
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return String(process.env.RAILWAY_STATIC_URL).replace(/\/$/, '');
  }
  return 'http://localhost:5000';
}

const API_ORIGIN = resolveApiOrigin();

/** ממיר נתיב יחסי (/uploads/...) לכתובת מלאה לתצוגה בדפדפן */
export function absoluteMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `${API_ORIGIN}${s.startsWith('/') ? s : `/${s}`}`;
}
