import { Link } from 'react-router-dom';
import ResubmitApartmentButton from './ResubmitApartmentButton';
import '../pages/MyApartmentsPage.css';

/**
 * באנר + כפתור לשליחה חוזרת לאישור אחרי דחיית מנהל.
 */
export default function RejectedListingActions({
  apartment,
  onResubmitted,
  showEditLink = true,
  showResubmitButton = true,
  className = '',
}) {
  if (!apartment || String(apartment.status || '').toLowerCase() !== 'rejected') return null;

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
      {(showResubmitButton || showEditLink) && (
        <div className="rejected-listing-actions__buttons">
          {showResubmitButton && (
            <ResubmitApartmentButton apartment={apartment} onResubmitted={onResubmitted} />
          )}
          {showEditLink && (
            <Link to={`/my-apartments/${apartment.id}/edit`} className="btn-outline-gold">
              עריכת פרטי הדירה
            </Link>
          )}
          <Link to="/my-apartments" className="my-apt-link">
            לכל הדירות שלי
          </Link>
        </div>
      )}
    </div>
  );
}
