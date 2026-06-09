import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyApartments, deleteApartment } from '../services/api';
import './MyApartmentsPage.css';

const STATUS_LABEL = {
  pending: 'ממתינה לאישור מנהל',
  approved: 'מאושרת ומפורסמת',
  rejected: 'נדחתה',
  expired: 'פג תוקף — הושעתה',
};

function MyApartmentsPage() {
  const { user } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getMyApartments();
      setApartments(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    if (!confirm('למחוק את הדירה? פעולה זו אינה הפיכה.')) return;
    try {
      await deleteApartment(id);
      setApartments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="my-apartments-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">הדירות שלי</h1>
          <p className="page-subtitle">שלום {user?.full_name} — כאן ניתן לראות ולנהל את הדירות שלך</p>
        </div>
        <Link to="/list-apartment" className="btn-primary">+ פרסם דירה חדשה</Link>
      </div>

      {loading && <p className="loading-text">טוען...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && !error && apartments.length === 0 && (
        <div className="empty-state">
          <p>עדיין אין לך דירות.</p>
          <Link to="/list-apartment" className="btn-primary">פרסם את הדירה הראשונה שלך</Link>
        </div>
      )}

      {!loading && apartments.length > 0 && (
        <div className="my-apt-list">
          {apartments.map((apt) => (
            <article key={apt.id} className={`my-apt-card status-${apt.status}`}>
              <div className="my-apt-thumb">
                {apt.image && <img src={apt.image} alt={apt.title} />}
              </div>
              <div className="my-apt-body">
                <div className="my-apt-header">
                  <h3>{apt.title}</h3>
                  <span className={`status-pill status-${apt.status}`}>
                    {STATUS_LABEL[apt.status] || apt.status}
                  </span>
                </div>
                <p className="my-apt-meta">
                  {apt.location} · {apt.bedrooms} חדרי שינה · עד {apt.max_guests} נפשות · ₪{apt.price_per_night}
                </p>
                {apt.status === 'rejected' && apt.rejection_reason && (
                  <p className="my-apt-reject">סיבת דחייה: {apt.rejection_reason}</p>
                )}
                {apt.status === 'expired' && (
                  <p className="my-apt-reject">תוקף הפרסום פג והמודעה הושעתה. ניתן לחדש את הפרסום.</p>
                )}
                <div className="my-apt-actions">
                  {apt.status === 'expired' && (
                    <Link to={`/my-apartments/${apt.id}/renew`} className="btn-primary">
                      חדש מודעה
                    </Link>
                  )}
                  <Link to={`/my-apartments/${apt.id}/edit`} className="btn-outline-gold">ערוך</Link>
                  <Link to={`/apartments/${apt.id}`} className="my-apt-link">צפייה</Link>
                  <button
                    type="button"
                    className="my-apt-delete"
                    onClick={() => handleDelete(apt.id)}
                  >
                    מחק
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

export default MyApartmentsPage;
