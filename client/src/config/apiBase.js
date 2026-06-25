const DEFAULT_API_BASE = 'https://vacation-rentals-agency-production.up.railway.app/api';

/** Ensures API base always ends with `/api` (Vercel env sometimes omits it). */
export function getApiBase() {
  const raw =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
  let base = String(raw).trim();
  // Same-origin proxy on Vercel (/api → Railway) — keep relative path
  if (base === '/api' || base.startsWith('/api/')) {
    return '/api';
  }
  // Strip trailing slashes, then any accidental path after /api
  base = base.replace(/\/+$/, '');
  if (base.includes('/api/')) {
    base = base.split('/api/')[0] + '/api';
  } else if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}
