// הגדרת CORS: production + Vercel preview deployments + optional env overrides.
// מקור הרשימה: CORS_ORIGINS או CLIENT_ORIGIN (מופרד בפסיקים).
// בפיתוח מתירים גם localhost.

const isProd = process.env.NODE_ENV === 'production';

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_PROD_ORIGINS = [
  'https://vications-apartments-node-repo.vercel.app',
];

/** Production URL and Vercel preview URLs (e.g. …-ptxtgmlpk.vercel.app). */
const VERCEL_ORIGIN_PATTERN =
  /^https:\/\/vications-apartments-node-repo(-[a-z0-9]+)?\.vercel\.app$/i;

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

export function isAllowedOrigin(origin) {
  const normalized = origin.replace(/\/$/, '');
  if (allowList.includes(normalized)) return true;
  if (VERCEL_ORIGIN_PATTERN.test(normalized)) return true;
  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export { allowList as corsAllowList };
