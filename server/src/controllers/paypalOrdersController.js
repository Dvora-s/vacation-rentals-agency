import {
  paypalCreateOrder,
  paypalCaptureOrder,
  paypalAuthorizeOrder,
} from '../services/paypalRest.js';
import { HttpError } from '../utils/HttpError.js';

const ALLOWED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'ILS']);

function normalizeAmount(body) {
  const currency = String(body?.currency_code || 'ILS')
    .toUpperCase()
    .trim();
  if (!ALLOWED_CURRENCIES.has(currency)) {
    throw new HttpError(
      400,
      `מטבע לא נתמך (מותר: ${[...ALLOWED_CURRENCIES].join(', ')})`,
      'PAYPAL_BAD_CURRENCY',
    );
  }
  const raw = body?.value ?? body?.amount;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000) {
    throw new HttpError(400, 'סכום לא תקין (חייב להיות מספר חיובי, עד 50000)', 'PAYPAL_BAD_AMOUNT');
  }
  const value = n.toFixed(2);
  return { currency_code: currency, value };
}

function rethrowPayPalError(e, fallbackStatus = 502) {
  if (e instanceof HttpError) throw e;
  const status = Number(e.statusCode || fallbackStatus) || fallbackStatus;
  throw new HttpError(status, e.message || 'שגיאת PayPal', 'PAYPAL_API_ERROR');
}

export async function createOrder(req, res) {
  try {
    const amount = normalizeAmount(req.body || {});
    const intent =
      String(req.body?.intent || '').toLowerCase() === 'authorize' ? 'AUTHORIZE' : 'CAPTURE';
    const order = await paypalCreateOrder(amount, { intent });
    if (!order?.id) {
      throw new HttpError(502, 'PayPal לא החזיר מזהה הזמנה', 'PAYPAL_NO_ORDER_ID');
    }
    res.status(201).json({ id: order.id, orderID: order.id, status: order.status, intent });
  } catch (e) {
    rethrowPayPalError(e);
  }
}

export async function captureOrder(req, res) {
  const orderID = String(req.params.orderID || '').trim();
  if (!orderID || orderID.length > 128) {
    throw new HttpError(400, 'מזהה הזמנה PayPal לא תקין', 'PAYPAL_BAD_ORDER_ID');
  }
  try {
    const result = await paypalCaptureOrder(orderID);
    res.json(result);
  } catch (e) {
    rethrowPayPalError(e);
  }
}

export async function authorizeOrder(req, res) {
  const orderID = String(req.params.orderID || '').trim();
  if (!orderID || orderID.length > 128) {
    throw new HttpError(400, 'מזהה הזמנה PayPal לא תקין', 'PAYPAL_BAD_ORDER_ID');
  }
  try {
    const result = await paypalAuthorizeOrder(orderID);
    res.json(result);
  } catch (e) {
    rethrowPayPalError(e);
  }
}
