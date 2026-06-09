import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminListPricingPlans,
  adminCreatePricingPlan,
  adminUpdatePricingPlan,
  adminDeletePricingPlan,
  adminListPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
} from '../services/api';
import './AdminPricingPage.css';

const emptyPlan = {
  slug: '',
  name: '',
  description: '',
  price: '',
  compare_at_price: '',
  currency: 'ILS',
  category: 'hosts',
  duration_months: '1',
  duration_label: '',
  features_text: '',
  highlight_type: 'none',
  badge_text: '',
  sort_order: '0',
  is_active: true,
};

const emptyPromo = {
  name: '',
  discount_type: 'percent',
  discount_value: '',
  pricing_plan_id: '',
  is_active: true,
  starts_at: '',
  ends_at: '',
};

function toDatetimeLocalValue(s) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(+d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseFeaturesFromRow(row) {
  const j = row.features_json;
  if (Array.isArray(j)) return j.join('\n');
  if (typeof j === 'string') {
    try {
      return JSON.parse(j).join('\n');
    } catch {
      return j;
    }
  }
  return '';
}

function AdminPricingPage() {
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [promoForm, setPromoForm] = useState(emptyPromo);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    const rows = await adminListPricingPlans();
    setPlans(rows);
  }, []);

  const loadPromos = useCallback(async () => {
    const rows = await adminListPromotions();
    setPromotions(rows);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPlans(), loadPromos()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadPlans, loadPromos]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function resetPlanForm() {
    setPlanForm(emptyPlan);
    setEditingPlanId(null);
  }

  function resetPromoForm() {
    setPromoForm(emptyPromo);
    setEditingPromoId(null);
  }

  function editPlan(row) {
    setEditingPlanId(row.id);
    setPlanForm({
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      price: String(row.price),
      compare_at_price: row.compare_at_price != null ? String(row.compare_at_price) : '',
      currency: row.currency || 'ILS',
      category: row.category,
      duration_months: String(row.duration_months),
      duration_label: row.duration_label || '',
      features_text: parseFeaturesFromRow(row),
      highlight_type: row.highlight_type || 'none',
      badge_text: row.badge_text || '',
      sort_order: String(row.sort_order ?? 0),
      is_active: !!row.is_active,
    });
  }

  function editPromo(row) {
    setEditingPromoId(row.id);
    setPromoForm({
      name: row.name,
      discount_type: row.discount_type,
      discount_value: String(row.discount_value),
      pricing_plan_id: row.pricing_plan_id != null ? String(row.pricing_plan_id) : '',
      is_active: !!row.is_active,
      starts_at: toDatetimeLocalValue(row.starts_at),
      ends_at: toDatetimeLocalValue(row.ends_at),
    });
  }

  async function submitPlan(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...planForm,
        features_text: planForm.features_text,
        price: Number(planForm.price),
        compare_at_price: planForm.compare_at_price === '' ? null : Number(planForm.compare_at_price),
        duration_months: Number(planForm.duration_months),
        sort_order: Number(planForm.sort_order),
      };
      if (editingPlanId) {
        await adminUpdatePricingPlan(editingPlanId, body);
      } else {
        await adminCreatePricingPlan(body);
      }
      await loadPlans();
      resetPlanForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPromo(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: promoForm.name,
        discount_type: promoForm.discount_type,
        discount_value: Number(promoForm.discount_value),
        pricing_plan_id: promoForm.pricing_plan_id === '' ? null : Number(promoForm.pricing_plan_id),
        is_active: promoForm.is_active,
        starts_at: new Date(promoForm.starts_at).toISOString(),
        ends_at: new Date(promoForm.ends_at).toISOString(),
      };
      if (Number.isNaN(+new Date(promoForm.starts_at)) || Number.isNaN(+new Date(promoForm.ends_at))) {
        throw new Error('תאריכים לא תקינים');
      }
      if (editingPromoId) {
        await adminUpdatePromotion(editingPromoId, body);
      } else {
        await adminCreatePromotion(body);
      }
      await loadPromos();
      resetPromoForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function delPlan(id) {
    if (!confirm('למחוק מסלול זה? מבצעים המקושרים יימחקו.')) return;
    try {
      await adminDeletePricingPlan(id);
      await loadPlans();
      if (editingPlanId === id) resetPlanForm();
    } catch (err) {
      alert(err.message);
    }
  }

  async function delPromo(id) {
    if (!confirm('למחוק מבצע זה?')) return;
    try {
      await adminDeletePromotion(id);
      await loadPromos();
      if (editingPromoId === id) resetPromoForm();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-pricing section-container">
      <div className="admin-pricing-header">
        <div>
          <h1 className="page-title">ניהול מחירון ומבצעים</h1>
          <p className="page-subtitle">עריכת מסלולי פרסום והנחות לעמוד המחירון הציבורי</p>
        </div>
        <Link to="/admin" className="admin-pricing-back">
          ← חזרה לאישורי דירות
        </Link>
      </div>

      <div className="admin-pricing-tabs">
        <button type="button" className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>
          מסלולים
        </button>
        <button type="button" className={tab === 'promotions' ? 'active' : ''} onClick={() => setTab('promotions')}>
          מבצעים
        </button>
      </div>

      {loading && <p className="loading-text">טוען...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && tab === 'plans' && (
        <>
          <form className="admin-pricing-form" onSubmit={submitPlan}>
            <h2>{editingPlanId ? 'עריכת מסלול' : 'מסלול חדש'}</h2>
            <div className="admin-pricing-grid">
              <label>
                Slug (אנגלית)
                <input
                  value={planForm.slug}
                  onChange={(e) => setPlanForm((p) => ({ ...p, slug: e.target.value }))}
                  disabled={!!editingPlanId}
                  required
                  dir="ltr"
                />
              </label>
              <label>
                שם תצוגה
                <input
                  value={planForm.name}
                  onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                קטגוריה
                <select
                  value={planForm.category}
                  onChange={(e) => setPlanForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="hosts">דירות / צימרים</option>
                  <option value="hotels">מלונות / מתחמים</option>
                </select>
              </label>
              <label>
                מחיר (₪)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.price}
                  onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </label>
              <label>
                מחיר השוואה (קו חוצה, אופציונלי)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.compare_at_price}
                  onChange={(e) => setPlanForm((p) => ({ ...p, compare_at_price: e.target.value }))}
                />
              </label>
              <label>
                חודשי פרסום
                <input
                  type="number"
                  min="1"
                  value={planForm.duration_months}
                  onChange={(e) => setPlanForm((p) => ({ ...p, duration_months: e.target.value }))}
                />
              </label>
              <label>
                תווית משך (אופציונלי)
                <input
                  value={planForm.duration_label}
                  onChange={(e) => setPlanForm((p) => ({ ...p, duration_label: e.target.value }))}
                />
              </label>
              <label>
                סדר
                <input
                  type="number"
                  value={planForm.sort_order}
                  onChange={(e) => setPlanForm((p) => ({ ...p, sort_order: e.target.value }))}
                />
              </label>
              <label>
                הדגשת כרטיס
                <select
                  value={planForm.highlight_type}
                  onChange={(e) => setPlanForm((p) => ({ ...p, highlight_type: e.target.value }))}
                >
                  <option value="none">רגיל</option>
                  <option value="popular">פופולרי</option>
                  <option value="premium">פרימיום</option>
                </select>
              </label>
              <label>
                תג על הכרטיס
                <input
                  value={planForm.badge_text}
                  onChange={(e) => setPlanForm((p) => ({ ...p, badge_text: e.target.value }))}
                />
              </label>
              <label className="admin-pricing-span2">
                <input
                  type="checkbox"
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm((p) => ({ ...p, is_active: e.target.checked }))}
                />{' '}
                פעיל
              </label>
              <label className="admin-pricing-span2">
                תכונות (שורה לכל תכונה)
                <textarea
                  rows={5}
                  value={planForm.features_text}
                  onChange={(e) => setPlanForm((p) => ({ ...p, features_text: e.target.value }))}
                  required
                />
              </label>
              <label className="admin-pricing-span2">
                תיאור (אופציונלי)
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>
            <div className="admin-pricing-form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'שומר...' : editingPlanId ? 'עדכון' : 'יצירה'}
              </button>
              {editingPlanId && (
                <button type="button" className="admin-pricing-cancel" onClick={resetPlanForm}>
                  ביטול
                </button>
              )}
            </div>
          </form>

          <div className="admin-pricing-table-wrap">
            <h3>כל המסלולים</h3>
            <table className="admin-pricing-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>קטגוריה</th>
                  <th>מחיר</th>
                  <th>פעיל</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>₪{Number(row.price).toFixed(2)}</td>
                    <td>{row.is_active ? 'כן' : 'לא'}</td>
                    <td className="admin-pricing-row-actions">
                      <button type="button" className="linklike" onClick={() => editPlan(row)}>
                        עריכה
                      </button>
                      <button type="button" className="linklike danger" onClick={() => delPlan(row.id)}>
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && tab === 'promotions' && (
        <>
          <form className="admin-pricing-form" onSubmit={submitPromo}>
            <h2>{editingPromoId ? 'עריכת מבצע' : 'מבצע חדש'}</h2>
            <div className="admin-pricing-grid">
              <label className="admin-pricing-span2">
                שם המבצע
                <input
                  value={promoForm.name}
                  onChange={(e) => setPromoForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                סוג הנחה
                <select
                  value={promoForm.discount_type}
                  onChange={(e) => setPromoForm((p) => ({ ...p, discount_type: e.target.value }))}
                >
                  <option value="percent">אחוזים</option>
                  <option value="flat">סכום קבוע (₪)</option>
                </select>
              </label>
              <label>
                ערך
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm((p) => ({ ...p, discount_value: e.target.value }))}
                  required
                />
              </label>
              <label className="admin-pricing-span2">
                מסלול (ריק = גלובלי על כל המסלולים)
                <select
                  value={promoForm.pricing_plan_id}
                  onChange={(e) => setPromoForm((p) => ({ ...p, pricing_plan_id: e.target.value }))}
                >
                  <option value="">— גלובלי —</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.slug})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                התחלה
                <input
                  type="datetime-local"
                  value={promoForm.starts_at}
                  onChange={(e) => setPromoForm((p) => ({ ...p, starts_at: e.target.value }))}
                  required
                />
              </label>
              <label>
                סיום
                <input
                  type="datetime-local"
                  value={promoForm.ends_at}
                  onChange={(e) => setPromoForm((p) => ({ ...p, ends_at: e.target.value }))}
                  required
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm((p) => ({ ...p, is_active: e.target.checked }))}
                />{' '}
                פעיל
              </label>
            </div>
            <div className="admin-pricing-form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'שומר...' : editingPromoId ? 'עדכון' : 'יצירה'}
              </button>
              {editingPromoId && (
                <button type="button" className="admin-pricing-cancel" onClick={resetPromoForm}>
                  ביטול
                </button>
              )}
            </div>
          </form>

          <div className="admin-pricing-table-wrap">
            <h3>כל המבצעים</h3>
            <table className="admin-pricing-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>הנחה</th>
                  <th>מסלול</th>
                  <th>תאריכים</th>
                  <th>פעיל</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promotions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      {row.discount_type === 'percent' ? `${row.discount_value}%` : `₪${row.discount_value}`}
                    </td>
                    <td>{row.plan_name || 'גלובלי'}</td>
                    <td className="admin-pricing-dates">
                      {toDatetimeLocalValue(row.starts_at)} → {toDatetimeLocalValue(row.ends_at)}
                    </td>
                    <td>{row.is_active ? 'כן' : 'לא'}</td>
                    <td className="admin-pricing-row-actions">
                      <button type="button" className="linklike" onClick={() => editPromo(row)}>
                        עריכה
                      </button>
                      <button type="button" className="linklike danger" onClick={() => delPromo(row.id)}>
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPricingPage;
