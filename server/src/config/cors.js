// הגדרת CORS: production + כל פריסות Vercel של הפרויקט + env overrides.
// מקור הרשימה: CORS_ORIGINS או CLIENT_ORIGIN (מופרד בפסיקים).

const isProd = process.env.NODE_ENV === 'production';

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_PROD_ORIGINS = [
  'https://vacation-rentals-agency1.vercel.app',
  'https://vications-apartments-node-repo.vercel.app',
  // דומיין production רשמי
  'https://dirotnofesh.co.il',
  'https://www.dirotnofesh.co.il',
  'http://dirotnofesh.co.il',
  'http://www.dirotnofesh.co.il',
];

/** Vercel project name prefixes — production + preview URLs. */
const VERCEL_PROJECT_SLUGS = [
  'vacation-rentals-agency',
  'vications-apartments-node-repo',
];

function configuredOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN || '';
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const allowList = isProd
  ? [...DEFAULT_PROD_ORIGINS, ...configuredOrigins()]
  : [...DEV_ORIGINS, ...DEFAULT_PROD_ORIGINS, ...configuredOrigins()];

function isVercelProjectHost(hostname) {
  if (typeof hostname !== 'string' || !hostname.endsWith('.vercel.app')) return false;
  return VERCEL_PROJECT_SLUGS.some((slug) => hostname.includes(slug));
}

export function isAllowedOrigin(origin) {
  const normalized = origin.replace(/\/$/, '');
  if (allowList.includes(normalized)) return true;

  try {
    const { hostname, protocol } = new URL(normalized);
    if (isVercelProjectHost(hostname)) return true;
    if (!isProd && (protocol === 'http:' || protocol === 'https:')) {
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    }
  } catch {
    /* ignore malformed origin */
  }

  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
};

export { allowList as corsAllowList };
