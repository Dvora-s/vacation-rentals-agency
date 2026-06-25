import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPendingApartments,
  approveApartment,
  rejectApartment,
} from '../services/api';
import './MyApartmentsPage.css';

function AdminDashboardPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingApartments();
      setList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await approveApartment(id);
      setList((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function openRejectModal(apt) {
    setRejectTarget({ id: apt.id, title: apt.title });
    setRejectReason('');
    setRejectError(null);
  }

  function closeRejectModal() {
    if (busyId) return;
    setRejectTarget(null);
    setRejectReason('');
    setRejectError(null);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      setRejectError('נא לציין סיבת דחייה (לפחות 5 תווים)');
      return;
    }
    setRejectError(null);
    setBusyId(rejectTarget.id);
    try {
      await rejectApartment(rejectTarget.id, reason);
      setList((prev) => prev.filter((a) => a.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="my-apartments-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול אישורי דירות</h1>
          <p className="page-subtitle">
            דירות שממתינות לאישור. לאחר האישור הבעלים ישלם ורק אז המודעה תפורסם באתר.
          </p>
        </div>

        <Link to="/admin/pricing" className="btn-outline-gold">
          ניהול מחירון ומבצעים
        </Link>
        <Link to="/admin/listings" className="btn-outline-gold">
          דירות שפורסמו
        </Link>
        <Link to="/admin/users" className="my-apt-link">
          רשימת משתמשים
        </Link>
        <Link to="/admin/faq" className="my-apt-link">
          שאלות נפוצות
        </Link>
      </div>

      {loading && <p className="loading-text">טוען...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && !error && list.length === 0 && (
        <div className="empty-state">
          <p>אין כרגע דירות שממתינות לאישור 🎉</p>
        </div>
      )}

      {list.length > 0 && (
        <div className="my-apt-list">
          {list.map((apt) => (
            <article key={apt.id} className="my-apt-card status-pending">
              <div className="my-apt-thumb">
                {apt.image ? (
                  <img src={apt.image} alt={apt.title} />
                ) : (
                  <span className="my-apt-thumb-placeholder" title="אין תמונת שער">
                    ללא תמונה
                  </span>
                )}
              </div>
              <div className="my-apt-body">
                <div className="my-apt-header">
                  <h3>{apt.title}</h3>
                  <span className="status-pill status-pending">ממתין לאישור</span>
                </div>
                <p className="my-apt-meta">
                  {apt.location} · {apt.address || ''}
                </p>
                <p className="my-apt-meta">
                  ₪{apt.price_per_night} · {apt.bedrooms} חדרי שינה · עד {apt.max_guests} נפשות
                </p>
                {apt.description && <p className="my-apt-meta">{apt.description}</p>}
                <p className="my-apt-meta">
                  קשר: {apt.owner_name} {apt.owner_phone ? `· ${apt.owner_phone}` : ''}
                  {apt.owner_email ? ` · ${apt.owner_email}` : ''}
                </p>
                <div className="my-apt-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleApprove(apt.id)}
                    disabled={busyId === apt.id}
                  >
                    אישור
                  </button>
                  <button
                    type="button"
                    className="my-apt-delete"
                    onClick={() => openRejectModal(apt)}
                    disabled={busyId === apt.id}
                  >
                    דחייה
                  </button>
                  <Link to={`/my-apartments/${apt.id}/edit`} className="my-apt-link">
                    עריכת פרטים
                  </Link>
                  <Link to={`/apartments/${apt.id}`} className="my-apt-link">
                    צפייה בעמוד הדירה
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="admin-reject-overlay" role="presentation" onClick={closeRejectModal}>
          <div
            className="admin-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reject-modal-title">דחיית דירה</h2>
            <p className="admin-reject-modal__subtitle">
              {rejectTarget.title} — נא לציין למה הדירה נדחית. הבעלים יראה את הסיבה בחשבון שלו.
            </p>
            <label className="admin-reject-modal__label" htmlFor="reject-reason">
              סיבת הדחייה
            </label>
            <textarea
              id="reject-reason"
              className="admin-reject-modal__textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="לדוגמה: התמונות אינן ברורות, חסרים פרטי קשר, או שהתיאור לא מספיק מפורט..."
              disabled={busyId === rejectTarget.id}
            />
            {rejectError && (
              <div className="auth-error" role="alert">
                {rejectError}
              </div>
            )}
            <div className="admin-reject-modal__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={confirmReject}
                disabled={busyId === rejectTarget.id}
              >
                {busyId === rejectTarget.id ? 'שולח...' : 'אישור דחייה'}
              </button>
              <button
                type="button"
                className="btn-outline-gold"
                onClick={closeRejectModal}
                disabled={busyId === rejectTarget.id}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
