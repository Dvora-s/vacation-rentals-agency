import express from 'express';
import cors from 'cors';
import { testConnection } from './config/db.js';
import { corsOptions, isAllowedOrigin } from './config/cors.js';
import apartmentsRouter from './routes/apartments.js';
import authRouter from './routes/auth.js';
import paymentsRouter from './routes/payments.js';
import pricingPublicRouter from './routes/pricingPublic.js';
import pricingAdminRouter from './routes/pricingAdmin.js';
import uploadsRouter, { uploadsDir } from './routes/uploads.js';
import contactRouter from './routes/contact.js';
import faqPublicRouter from './routes/faqPublic.js';
import faqAdminRouter from './routes/faqAdmin.js';
import locationsRouter from './routes/locations.js';
import contentRouter from './routes/content.js';
import paypalOrdersRouter from './routes/paypalOrders.js';
import { getPayPalEnvStatus, logPayPalStartup, verifyPayPalOnStartup } from './services/paypalRest.js';
import { ensureAdminUser } from './bootstrap/ensureAdmin.js';
import { ensureListingPaymentsIntegrity } from './bootstrap/ensureListingPayments.js';
import { ensureFaqSeed } from './bootstrap/ensureFaq.js';
import { ensurePricingSeed } from './bootstrap/ensurePricing.js';
import { startListingExpiryJob } from './jobs/listingExpiry.js';
import { logger } from './utils/logger.js';
import { handlePayMeWebhookRequest } from './controllers/paymentController.js';
import { getPayMeEnvStatus } from './config/payme.js';
import { selectDatabaseInfo } from './models/dbMetaModel.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { isMailerConfigured, getMailerMode } from './utils/mailer.js';
import { getMailerDiagnostics, logMailerStartup } from './utils/resendMailer.js';
import {
  configureCloudinary,
  getCloudinaryDiagnostics,
  logCloudinaryStartup,
  verifyCloudinaryOnStartup,
} from './config/cloudinary.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Manual CORS first — guarantees preflight succeeds for allowed Vercel/Railway frontends.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }
  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Railway health probe — no database; must respond quickly so deploy is not marked dead.
app.get('/api/health/live', (_req, res) => {
  res.json({ status: 'ok', service: 'vacation-rentals-api' });
});

/** Legacy clients called /apartments instead of /api/apartments — rewrite before routing. */
const API_ROOT_PREFIXES = [
  '/apartments',
  '/auth',
  '/payments',
  '/pricing',
  '/admin',
  '/uploads',
  '/contact',
  '/faq',
  '/locations',
  '/content',
  '/orders',
];

app.use((req, res, next) => {
  const pathOnly = req.path;
  if (pathOnly.startsWith('/api')) {
    next();
    return;
  }
  const needsApiPrefix = API_ROOT_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
  if (needsApiPrefix) {
    req.url = `/api${req.url}`;
  }
  next();
});

const isProd = process.env.NODE_ENV === 'production';

// מאחורי פרוקסי/לואד-בלאנסר בענן — מאפשר ל-req.ip לשקף את כתובת הלקוח האמיתית
// (חשוב ל-rate limiting). מופעל רק בפרודקשן.
if (isProd) {
  app.set('trust proxy', 1);
}

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

/**
 * PayMe webhooks must receive the raw body for signature verification.
 * TODO: If PayMe sends a non-JSON body (e.g. form-urlencoded), switch to `express.raw({ type: () => true })`
 * or a dedicated `express.text()` / `express.urlencoded()` chain per PayMe docs.
 */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(handlePayMeWebhookRequest),
);

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
    endpoints: ['/api/health', '/api/auth', '/api/apartments', '/api/pricing', '/api/orders'],
  });
});

// הגשת תמונות שהועלו (סטטי)
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRouter);
app.use('/api/apartments', apartmentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/pricing', pricingPublicRouter);
app.use('/api/admin/pricing', pricingAdminRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/faq', faqPublicRouter);
app.use('/api/admin/faq', faqAdminRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/content', contentRouter);
app.use('/api/orders', paypalOrdersRouter);

app.get('/api/health', async (_req, res) => {
  try {
    const dbStatus = await testConnection();
    await verifyPayPalOnStartup();
    const paypal = getPayPalEnvStatus();
    const payme = getPayMeEnvStatus();
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: dbStatus.ok === 1 ? 'connected' : 'unknown',
      mailer: {
        configured: isMailerConfigured(),
        mode: getMailerMode(),
        ...getMailerDiagnostics(),
      },
      uploads: getCloudinaryDiagnostics(),
      paypal,
      payme,
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
    const row = await selectDatabaseInfo();
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  void (async () => {
  logPayPalStartup();
  try {
    await verifyPayPalOnStartup();
    logPayPalStartup();
  } catch (err) {
    logger.warn('[PayPal] verify:', err.message);
  }
  const pm = getPayMeEnvStatus();
  if (!pm.configured) {
    logger.warn(
      `[PayMe] חסרים משתני סביבה או תצורה חלקית: configured=${pm.configured} baseUrl=${pm.hasBaseUrl} merchantId=${pm.hasMerchantId} apiKey=${pm.hasApiKey} secret=${pm.hasSecret} webhookSecret=${pm.hasWebhookSecret}. ראו docs/PAYME_INTEGRATION.md ו־GET /api/health.`,
    );
  }
  logMailerStartup();
  configureCloudinary();
  logCloudinaryStartup();
  try {
    await verifyCloudinaryOnStartup();
  } catch (err) {
    logger.warn('[uploads] Cloudinary verify:', err.message);
  }
  try {
    await ensurePricingSeed();
  } catch (err) {
    logger.warn('[pricing] Could not ensure pricing seed:', err.message);
  }
  try {
    await ensureFaqSeed();
  } catch (err) {
    logger.warn('[faq] Could not ensure FAQ seed:', err.message);
  }
  try {
    await ensureAdminUser();
  } catch (err) {
    logger.warn('[Auth] Could not ensure admin user:', err.message);
  }
  try {
    await ensureListingPaymentsIntegrity();
  } catch (err) {
    logger.warn('[listing_payments] Could not repair legacy payment rows:', err.message);
  }
  try {
    startListingExpiryJob();
  } catch (err) {
    logger.warn('[expiry] לא ניתן להפעיל את תזמון תוקף המודעות:', err.message);
  }
  })();
});
