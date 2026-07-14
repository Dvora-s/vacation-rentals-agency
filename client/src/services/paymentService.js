/**
 * PayMe payment API (browser → your Node API).
 * Never put PayMe secrets here — only JWT-authenticated calls to your backend.
 */
import { getToken } from './api.js';
import { getApiBase } from '../config/apiBase.js';

const API_BASE = getApiBase();

async function paymentFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (!token) {
    throw new Error('נדרשת התחברות כדי לבצע תשלום');
  }
  headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || `שגיאה ${res.status}`;
    throw new Error(message);
  }
  return data;
}

/**
 * Create a PayMe iFrame / Hosted Fields session (Generate Payment API).
 * @param {{ price: number, currency?: string, product_name: string, amount?: number, description?: string, metadata?: object, return_url?: string, cancel_url?: string }} payload
 * @returns {Promise<{ paymentId: number, payme_sale_id: string, paymeSaleId: string }>}
 */
export async function createPaymentSession(payload) {
  return paymentFetch('/payments/create-session', { method: 'POST', body: payload });
}

/** @deprecated use createPaymentSession */
export async function createPayment(payload) {
  return paymentFetch('/payments/create', { method: 'POST', body: payload });
}

/**
 * Fetch payment status from your API (DB; updated via IPN callback).
 * @param {number|string} paymentId
 */
export async function getPaymentStatus(paymentId, { sync = false } = {}) {
  const q = sync ? '?sync=1' : '';
  return paymentFetch(`/payments/${encodeURIComponent(String(paymentId))}/status${q}`);
}

/** Convert ILS major units to agorot (integer). */
export function ilsToAgorot(ils) {
  return Math.round(Number(ils) * 100);
}
