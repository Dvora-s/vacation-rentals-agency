import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApartmentById, resubmitApartmentForApproval } from '../services/api';
import './ListApartmentPage.css';

function RenewApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getApartmentById(id)
      .then((apt) => {
        if (apt.status !== 'expired') {
          throw new Error('ניתן לשלוח לאישור מחדש רק מודעות שפג תוקפן.');
        }
        setApartment(apt);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResubmit() {
    if (!confirm('לשלוח את הדירה שוב לאישור המנהל?')) return;
    setError(null);
    setSubmitting(true);
    try {
      await resubmitApartmentForApproval(id);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="loading-text section-container">טוען...</p>;

  if (done) {
    return (
      <div className="list-apt-page section-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>הדירה נשלחה לאישור</h1>
          <p>
            המודעה נשלחה שוב לאישור המנהל. לאחר האישור תקבלו הודעה במייל ותוכלו להשלים את התשלום.
          </p>
          <div className="success-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/my-apartments')}>
              לדירות שלי
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">חידוש פרסום המודעה</h1>
      <p className="page-subtitle">
        תוקף הפרסום של <strong>"{apartment?.title}"</strong> פג. שלחו את המודעה שוב לאישור המנהל,
        ולאחר האישור השלימו את התשלום כדי לפרסם מחדש באתר.
      </p>

      {error && <div className="auth-error">{error}</div>}

      <div className="payment-card">
        <button type="button" className="btn-primary" onClick={handleResubmit} disabled={submitting}>
          {submitting ? 'שולח...' : 'שליחה לאישור מחדש'}
        </button>
      </div>
    </div>
  );
}

export default RenewApartmentPage;
