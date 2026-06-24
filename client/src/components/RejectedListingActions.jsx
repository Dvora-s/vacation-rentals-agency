import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resubmitApartmentForApproval } from '../services/api';
import '../pages/MyApartmentsPage.css';

/**
 * באנר + כפתור לשליחה חוזרת לאישור אחרי דחיית מנהל.
 */
export default function RejectedListingActions({
  apartment,
  onResubmitted,
  showEditLink = true,
  className = '',
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!apartment || apartment.status !== 'rejected') return null;

  async function handleResubmit() {
    if (!confirm('לשלוח את הדירה שוב לאישור המנהל?')) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await resubmitApartmentForApproval(apartment.id);
      onResubmitted?.(updated);
    } catch (err) {
      setError(err.message || 'השליחה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rejected-listing-actions ${className}`.trim()} role="region" aria-label="דירה שנדחתה">
      <p className="my-apt-reject">
        <strong>הדירה נדחתה.</strong>{' '}
        {apartment.rejection_reason
          ? `סיבת הדחייה: ${apartment.rejection_reason}`
          : 'לא צוינה סיבת דחייה — פנו למנהל המערכת.'}
      </p>
      <p className="rejected-listing-actions__hint">
        לאחר שתיקנתם את הפרטים לפי ההערות, לחצו על הכפתור כדי לשלוח שוב לאישור המנהל.
      </p>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      <div className="rejected-listing-actions__buttons">
        <button type="button" className="btn-primary" onClick={handleResubmit} disabled={busy}>
          {busy ? 'שולח...' : 'שליחה חוזרת לאישור'}
        </button>
        {showEditLink && (
          <Link to={`/my-apartments/${apartment.id}/edit`} className="btn-outline-gold">
            עריכת פרטי הדירה
          </Link>
        )}
        <Link to="/my-apartments" className="my-apt-link">
          לכל הדירות שלי
        </Link>
      </div>
    </div>
  );
}
