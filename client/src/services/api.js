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
  // auth נשלח אם קיים טוקן — מאפשר לבעלים/מנהל לצפות גם במודעה שאינה מאושרת (pending/expired).
  return apiFetch(`/apartments/${id}`, { auth: true });
}

// נכסים מומלצים = הנכסים החדשים ביותר שהתווספו (לפי created_at, ובהיעדרו לפי id).
export async function getFeaturedApartments(limit = 3) {
  const apartments = await getApartments();
  return [...apartments]
    .filter((a) => a.is_available)
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      if (tb !== ta) return tb - ta;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    })
    .slice(0, limit);
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

// ────────── העלאת תמונות ──────────
export async function uploadImages(files) {
  const list = Array.from(files || []).filter(Boolean);
  if (list.length === 0) return [];
  const formData = new FormData();
  for (const file of list) formData.append('images', file);

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `שגיאה ${res.status}`);
  }
  return data.urls || [];
}

// ────────── אוטנטיקציה ──────────
// הרשמה רגילה: מחזירה pending_verification (אין טוקן עד לאימות האימייל).
export async function register(payload) {
  return apiFetch('/auth/register', { method: 'POST', body: payload });
}

export async function login(payload) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: payload });
  if (data?.token) setToken(data.token);
  return data;
}

// התחברות/הרשמה דרך גוגל — מקבלת credential (ID token) ומחזירה user+token.
export async function loginWithGoogle(credential) {
  const data = await apiFetch('/auth/google', { method: 'POST', body: { credential } });
  if (data?.token) setToken(data.token);
  return data;
}

export async function verifyEmail(token) {
  return apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification(email) {
  return apiFetch('/auth/resend-verification', { method: 'POST', body: { email } });
}

export async function getMe() {
  return apiFetch('/auth/me', { auth: true });
}

export function logout() {
  clearToken();
}

// רשימת כל המשתמשים — למנהל בלבד
export async function getUsers() {
  return apiFetch('/auth/users', { auth: true });
}

// ────────── תשלומים ──────────
export async function getListingFee() {
  return apiFetch('/payments/fee');
}

export async function payForListing({ apartment_id, months = 1, tier = 'standard', provider_reference }) {
  return apiFetch('/payments', {
    method: 'POST',
    body: { apartment_id, months, tier, provider_reference },
    auth: true,
  });
}

export async function getMyPayments() {
  return apiFetch('/payments/mine', { auth: true });
}

// ────────── מחירון (ציבורי) ──────────
export async function getPricingCatalog() {
  return apiFetch('/pricing/catalog');
}

// ────────── מחירון — ניהול מנהל ──────────
export async function adminListPricingPlans() {
  return apiFetch('/admin/pricing/plans', { auth: true });
}

export async function adminCreatePricingPlan(body) {
  return apiFetch('/admin/pricing/plans', { method: 'POST', body, auth: true });
}

export async function adminUpdatePricingPlan(id, body) {
  return apiFetch(`/admin/pricing/plans/${id}`, { method: 'PUT', body, auth: true });
}

export async function adminDeletePricingPlan(id) {
  return apiFetch(`/admin/pricing/plans/${id}`, { method: 'DELETE', auth: true });
}

export async function adminListPromotions() {
  return apiFetch('/admin/pricing/promotions', { auth: true });
}

export async function adminCreatePromotion(body) {
  return apiFetch('/admin/pricing/promotions', { method: 'POST', body, auth: true });
}

export async function adminUpdatePromotion(id, body) {
  return apiFetch(`/admin/pricing/promotions/${id}`, { method: 'PUT', body, auth: true });
}

export async function adminDeletePromotion(id) {
  return apiFetch(`/admin/pricing/promotions/${id}`, { method: 'DELETE', auth: true });
}

// ────────── צור קשר ──────────
export async function submitContactMessage(payload) {
  if (USE_MOCK) {
    await mockDelay(900);
    return { ok: true, message: 'ההודעה נשלחה בהצלחה' };
  }
  return apiFetch('/contact', { method: 'POST', body: payload });
}
