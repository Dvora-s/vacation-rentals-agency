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

  async function handleReject(id) {
    const reason = prompt('סיבת הדחייה (אופציונלי):');
    if (reason === null) return;
    setBusyId(id);
    try {
      await rejectApartment(id, reason || null);
      setList((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="my-apartments-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול אישורי דירות</h1>
          <p className="page-subtitle">דירות שממתינות לאישור פרסום</p>
        </div>

        <Link to="/admin/pricing" className="btn-outline-gold">
          ניהול מחירון ומבצעים
=======
        <Link to="/admin/users" className="my-apt-link">
          רשימת משתמשים

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
                {apt.image && <img src={apt.image} alt={apt.title} />}
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
                    onClick={() => handleReject(apt.id)}
                    disabled={busyId === apt.id}
                  >
                    דחייה
                  </button>
                  <Link to={`/apartments/${apt.id}`} className="my-apt-link">
                    צפייה בעמוד הדירה
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
