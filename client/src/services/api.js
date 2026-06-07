const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'nofesh.token';

const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// ────────── ניהול טוקן (localStorage) ──────────
export function getToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  setToken(null);
}

// ────────── עוטף fetch ──────────
async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || `שגיאה ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// ────────── דירות ──────────
export async function getApartments() {
  if (USE_MOCK) {
    const { mockApartments } = await import('../data/mockApartments.js');
    await mockDelay();
    return mockApartments.filter((a) => !a.status || a.status === 'approved');
  }
  return apiFetch('/apartments');
}

export async function getApartmentById(id) {
  if (USE_MOCK) {
    const { mockApartments } = await import('../data/mockApartments.js');
    await mockDelay();
    const apartment = mockApartments.find((a) => a.id === Number(id));
    if (!apartment) throw new Error('Apartment not found');
    return apartment;
  }
  return apiFetch(`/apartments/${id}`);
}

export async function getFeaturedApartments(limit = 3) {
  const apartments = await getApartments();
  return apartments.filter((a) => a.is_available).slice(0, limit);
}

export async function createApartment(payload) {
  return apiFetch('/apartments', { method: 'POST', body: payload, auth: true });
}

export async function updateApartment(id, payload) {
  return apiFetch(`/apartments/${id}`, { method: 'PUT', body: payload, auth: true });
}

export async function deleteApartment(id) {
  return apiFetch(`/apartments/${id}`, { method: 'DELETE', auth: true });
}

export async function getMyApartments() {
  return apiFetch('/apartments/mine', { auth: true });
}

export async function getPendingApartments() {
  return apiFetch('/apartments/pending', { auth: true });
}

export async function approveApartment(id) {
  return apiFetch(`/apartments/${id}/approve`, { method: 'POST', auth: true });
}

export async function rejectApartment(id, reason) {
  return apiFetch(`/apartments/${id}/reject`, {
    method: 'POST',
    body: { reason },
    auth: true,
  });
}

// ────────── אוטנטיקציה ──────────
export async function register(payload) {
  const data = await apiFetch('/auth/register', { method: 'POST', body: payload });
  if (data?.token) setToken(data.token);
  return data;
}

export async function login(payload) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: payload });
  if (data?.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me', { auth: true });
}

export function logout() {
  clearToken();
}

// ────────── תשלומים ──────────
export async function getListingFee() {
  return apiFetch('/payments/fee');
}

export async function payForListing({ apartment_id, months = 1, provider_reference }) {
  return apiFetch('/payments', {
    method: 'POST',
    body: { apartment_id, months, provider_reference },
    auth: true,
  });
}

export async function getMyPayments() {
  return apiFetch('/payments/mine', { auth: true });
}

// ────────── צור קשר ──────────
export async function submitContactMessage(payload) {
  if (USE_MOCK) {
    await mockDelay(900);
    return { ok: true, message: 'ההודעה נשלחה בהצלחה' };
  }
  return apiFetch('/contact', { method: 'POST', body: payload });
}
