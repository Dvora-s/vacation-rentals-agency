/**
 * PayMe payment API (browser → your Node API).
 * Never put PayMe secrets here — only JWT-authenticated calls to your backend.
 */
import { getToken } from './api.js';

const API_BASE = String(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/api',
).replace(/\/+$/, '');

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
 * Start a PayMe checkout session (server creates PayMe payment + DB row).
 * @param {{ amount: number, currency?: string, description?: string, metadata?: object, return_url?: string, cancel_url?: string }} payload
 */
export async function createPayment(payload) {
  return paymentFetch('/payments/create', { method: 'POST', body: payload });
}

/**
 * Fetch payment status from your API (DB; optional sync from PayMe via query).
 * @param {number|string} paymentId - Internal `payments.id`
 * @param {{ sync?: boolean }} [opts]
 */
export async function getPaymentStatus(paymentId, { sync = false } = {}) {
  const q = sync ? '?sync=1' : '';
  return paymentFetch(`/payments/${encodeURIComponent(String(paymentId))}/status${q}`);
}
