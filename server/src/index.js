import express from 'express';
import cors from 'cors';
import pool, { testConnection } from './config/db.js';
import apartmentsRouter from './routes/apartments.js';
import authRouter from './routes/auth.js';
import paymentsRouter from './routes/payments.js';
import pricingPublicRouter from './routes/pricingPublic.js';
import pricingAdminRouter from './routes/pricingAdmin.js';
import { ensureAdminUser } from './bootstrap/ensureAdmin.js';

const app = express();
const PORT = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === 'production';

/** Dev-friendly CSP on API responses (HMR / direct API calls from localhost:3000). */
const devConnectSrc = [
  "'self'",
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'ws://localhost:3000',
  'ws://127.0.0.1:3000',
  'ws://localhost:5000',
  'ws://127.0.0.1:5000',
  'ws://localhost:5173',
  'ws://127.0.0.1:5173',
];

app.use(cors());

/** API responses: explicit connect-src for dev (HMR / cross-port fetch). No Helmet dep — manual header. */
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const connectSrc = isProd
    ? "'self'"
    : devConnectSrc.join(' ');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `connect-src ${connectSrc}`,
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "script-src 'none'",
      "style-src 'none'",
    ].join('; ')
  );
  next();
});
app.use(express.json({ limit: '2mb' }));

// Chrome DevTools probes this URL on localhost (Automatic workspace folders).
// Handle early so it always wins; restart the API after pulling changes.
const CHROME_DEVTOOLS_JSON = '/.well-known/appspecific/com.chrome.devtools.json';
app.use((req, res, next) => {
  const pathOnly = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && pathOnly === CHROME_DEVTOOLS_JSON) {
    res.type('application/json').send('{}');
    return;
  }
  next();
});

// Port 5000 is JSON API only — opening http://localhost:5000/ in a browser had no route (404).
const CLIENT_DEV_URL = process.env.CLIENT_DEV_URL || 'http://localhost:3000/';
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>API</title></head><body>
<p><strong>This is the backend API</strong> (port ${PORT}). The React site is served separately.</p>
<p>Open the app: <a href="${CLIENT_DEV_URL}">${CLIENT_DEV_URL}</a></p>
<p>API check: <a href="/api/health">/api/health</a></p>
</body></html>`);
    return;
  }
  res.json({
    service: 'vacation-rentals-api',
    client: CLIENT_DEV_URL,
    endpoints: ['/api/health', '/api/auth', '/api/apartments', '/api/pricing'],
  });
});

app.use('/api/auth', authRouter);
app.use('/api/apartments', apartmentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/pricing', pricingPublicRouter);
app.use('/api/admin/pricing', pricingAdminRouter);

app.get('/api/health', async (_req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: dbStatus.ok === 1 ? 'connected' : 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Server is running but database is unavailable',
      error: error.message,
    });
  }
});

app.get('/api/db-info', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db_name, VERSION() AS version');
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await ensureAdminUser();
  } catch (err) {
    console.warn('[Auth] Could not ensure admin user:', err.message);
  }
});
