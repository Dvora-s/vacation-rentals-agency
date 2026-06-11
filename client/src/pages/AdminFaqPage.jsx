import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminListFaqItems,
  adminCreateFaqItem,
  adminUpdateFaqItem,
  adminDeleteFaqItem,
} from '../services/api';
import './AdminFaqPage.css';

const emptyItem = {
  section: 'renters',
  question: '',
  answer: '',
  sort_order: '0',
};

const SECTION_LABEL = { renters: 'שוכרים', hosts: 'מארחים' };

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function AdminFaqPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await adminListFaqItems();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(emptyItem);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        section: form.section,
        question: form.question.trim(),
        answer: form.answer.trim(),
        sort_order: Number(form.sort_order) || 0,
      };
      if (editingId != null) {
        await adminUpdateFaqItem(Number(editingId), payload);
      } else {
        await adminCreateFaqItem(payload);
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) {
      setError('מזהה שורה לא תקין — רענני את העמוד');
      return;
    }
    setEditingId(id);
    setForm({
      section: row.section === 'hosts' ? 'hosts' : 'renters',
      question: row.question != null ? String(row.question) : '',
      answer: row.answer != null ? String(row.answer) : '',
      sort_order: String(row.sort_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק את השאלה הזו?')) return;
    setSaving(true);
    setError(null);
    try {
      await adminDeleteFaqItem(Number(id));
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-faq-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול שאלות נפוצות</h1>
          <p className="page-subtitle">הוספה, עריכה ומחיקה — גלוי למנהלים בלבד</p>
        </div>
        <div className="admin-faq-toolbar">
          <Link to="/faq" className="my-apt-link">
            לעמוד הציבורי
          </Link>
          <Link to="/admin" className="my-apt-link">
            לאישורי דירות
          </Link>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {USE_MOCK && (
        <div className="faq-warn admin-faq-mock-banner" role="status">
          <strong>VITE_USE_MOCK פעיל:</strong> עמוד &quot;שאלות נפוצות&quot; לציבור מציג תוכן דמו מהקוד, לא מהמסד. כאן מוצגות רק שאלות שנשמרו ב־DB. אם הרשימה ריקה — הריצו{' '}
          <code>npm run setup-faq</code> בתיקיית השרת. כדי שהאתר הציבורי יציג את אותו תוכן מהמסד, הגדירי <code>VITE_USE_MOCK=false</code> ב־<code>client/.env</code> והפעילי מחדש את Vite.
        </div>
      )}

      <form className="admin-faq-form" onSubmit={handleSubmit}>
        <h2>{editingId ? `עריכת שאלה #${editingId}` : 'שאלה חדשה'}</h2>
        <div className="admin-faq-field">
          <label htmlFor="faq-section">קטגוריה</label>
          <select
            id="faq-section"
            value={form.section}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
          >
            <option value="renters">שוכרים</option>
            <option value="hosts">מארחים</option>
          </select>
        </div>
        <div className="admin-faq-field">
          <label htmlFor="faq-sort">סדר בתוך הקטגוריה (מספר קטן = למעלה)</label>
          <input
            id="faq-sort"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
          />
        </div>
        <div className="admin-faq-field">
          <label htmlFor="faq-q">שאלה</label>
          <textarea
            id="faq-q"
            required
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
        </div>
        <div className="admin-faq-field">
          <label htmlFor="faq-a">תשובה</label>
          <textarea
            id="faq-a"
            required
            rows={6}
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
        </div>
        <div className="admin-faq-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {editingId ? 'שמירה' : 'הוספה'}
          </button>
          {editingId && (
            <button type="button" className="btn-outline-gold" onClick={resetForm} disabled={saving}>
              ביטול עריכה
            </button>
          )}
        </div>
      </form>

      {loading && <p className="loading-text">טוען...</p>}

      {!loading && (
        <div className="admin-faq-list">
          {items.length === 0 && (
            <p className="empty-state">
              אין שאלות במסד הנתונים. הריצו <code>npm run setup-faq</code> מתוך תיקיית <code>server</code>, או הוסיפו שאלה חדשה בטופס למעלה.
              {USE_MOCK && <> שימי לב: בזמן מצב Mock הציבור רואה תוכן דמו — לא את מה שמופיע כאן.</>}
            </p>
          )}
          {items.map((row) => (
            <article key={row.id} className="admin-faq-card">
              <div className="admin-faq-card-head">
                <span className="admin-faq-badge">{SECTION_LABEL[row.section] || row.section}</span>
                <div className="admin-faq-card-actions">
                  <button type="button" onClick={() => startEdit(row)} disabled={saving}>
                    עריכה
                  </button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(row.id)} disabled={saving}>
                    מחיקה
                  </button>
                </div>
              </div>
              <p className="admin-faq-preview-q">{row.question}</p>
              <p className="admin-faq-preview-a">{row.answer}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminFaqPage;
