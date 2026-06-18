const DEFAULT_API_BASE = 'https://vacation-rentals-agency-production.up.railway.app/api';

/** Ensures API base always ends with `/api` (Vercel env sometimes omits it). */
export function getApiBase() {
  const raw =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
  let base = String(raw).trim().replace(/\/+$/, '');
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}
