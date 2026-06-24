import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteApartment, getPublishedApartmentsForAdmin } from '../services/api';
import './MyApartmentsPage.css';

const STATUS_LABEL = {
  approved: 'מפורסמת',
  expired: 'פג תוקף',
};

function AdminPublishedListingsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setList(await getPublishedApartmentsForAdmin());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id, title) {
    if (!confirm(`למחוק לצמיתות את הדירה "${title}" מהאתר?`)) return;
    setBusyId(id);
    try {
      await deleteApartment(id);
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
          <h1 className="page-title">דירות שפורסמו</h1>
          <p className="page-subtitle">
            רשימת מודעות פעילות או שפג תוקפן. ניתן למחוק דירה מהאתר לצמיתות.
          </p>
        </div>
        <Link to="/admin" className="btn-outline-gold">
          חזרה לאישורים
        </Link>
      </div>

      {loading && <p className="loading-text">טוען...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && !error && list.length === 0 && (
        <div className="empty-state">
          <p>אין כרגע דירות שפורסמו באתר.</p>
        </div>
      )}

      {list.length > 0 && (
        <div className="my-apt-list">
          {list.map((apt) => (
            <article key={apt.id} className={`my-apt-card status-${apt.status}`}>
              <div className="my-apt-thumb">
                {apt.image ? (
                  <img src={apt.image} alt={apt.title} />
                ) : (
                  <span className="my-apt-thumb-placeholder">ללא תמונה</span>
                )}
              </div>
              <div className="my-apt-body">
                <div className="my-apt-header">
                  <h3>{apt.title}</h3>
                  <span className={`status-pill status-${apt.status}`}>
                    {STATUS_LABEL[apt.status] || apt.status}
                  </span>
                </div>
                <p className="my-apt-meta">
                  {apt.location} · ₪{apt.price_per_night} · {apt.bedrooms} חדרי שינה
                </p>
                <p className="my-apt-meta">
                  בעלים: {apt.owner_name || '—'}
                  {apt.owner_email ? ` · ${apt.owner_email}` : ''}
                </p>
                <div className="my-apt-actions">
                  <Link to={`/apartments/${apt.id}`} className="my-apt-link">
                    צפייה בעמוד הדירה
                  </Link>
                  <Link to={`/my-apartments/${apt.id}/edit`} className="my-apt-link">
                    עריכה
                  </Link>
                  <button
                    type="button"
                    className="my-apt-delete"
                    disabled={busyId === apt.id}
                    onClick={() => handleDelete(apt.id, apt.title)}
                  >
                    {busyId === apt.id ? 'מוחק...' : 'מחק מהאתר'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPublishedListingsPage;
