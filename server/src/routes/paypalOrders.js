import { Router } from 'express';
import { paypalCreateOrder, paypalCaptureOrder } from '../services/paypalRest.js';

const router = Router();

const ALLOWED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'ILS']);

function normalizeAmount(body) {
  const currency = String(body?.currency_code || 'USD')
    .toUpperCase()
    .trim();
  if (!ALLOWED_CURRENCIES.has(currency)) {
    const err = new Error(`Unsupported currency_code (allowed: ${[...ALLOWED_CURRENCIES].join(', ')})`);
    err.statusCode = 400;
    throw err;
  }
  const raw = body?.value ?? body?.amount;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000) {
    const err = new Error('Invalid amount (must be a positive number, max 50000)');
    err.statusCode = 400;
    throw err;
  }
  const value = n.toFixed(2);
  return { currency_code: currency, value };
}

/** POST /api/orders — create PayPal order (Step 1) */
router.post('/', async (req, res) => {
  try {
    const amount = normalizeAmount(req.body || {});
    const order = await paypalCreateOrder(amount);
    if (!order?.id) {
      return res.status(502).json({ error: 'PayPal did not return an order id' });
    }
    res.status(201).json({ id: order.id, status: order.status });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ error: e.message || 'Order creation failed' });
  }
});

/** POST /api/orders/:orderID/capture — capture after buyer approves (Step 2) */
router.post('/:orderID/capture', async (req, res) => {
  try {
    const orderID = String(req.params.orderID || '').trim();
    if (!orderID || orderID.length > 128) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const result = await paypalCaptureOrder(orderID);
    res.json(result);
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ error: e.message || 'Capture failed' });
  }
});

export default router;
