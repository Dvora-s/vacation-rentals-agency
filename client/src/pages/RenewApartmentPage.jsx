import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApartmentById, getListingFee, payForListing } from '../services/api';
import './ListApartmentPage.css';

function RenewApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fee, setFee] = useState({ amount_per_month: 30, currency: 'ILS' });
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([getApartmentById(id), getListingFee()])
      .then(([apt, f]) => {
        setApartment(apt);
        if (f) setFee(f);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    setError(null);
    setSubmitting(true);
    try {
      await payForListing({ apartment_id: Number(id), months, provider_reference: paymentRef || null });
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
          <h1>המודעה חודשה!</h1>
          <p>תוקף הפרסום הוארך והמודעה חזרה לאוויר. תודה שחידשת את הפרסום.</p>
          <div className="success-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/my-apartments')}>
              לדירות שלי
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = fee.amount_per_month * months;

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">חידוש פרסום המודעה</h1>
      <p className="page-subtitle">
        חידוש הפרסום של <strong>"{apartment?.title}"</strong>. לאחר התשלום המודעה תחזור להופיע באתר.
      </p>

      {error && <div className="auth-error">{error}</div>}

      <div className="payment-card">
        <h3>פירוט החיוב</h3>
        <div className="payment-row">
          <span>עלות פרסום לחודש</span>
          <strong>₪{fee.amount_per_month}</strong>
        </div>

        <div className="payment-row">
          <label htmlFor="months">מספר חודשים</label>
          <input
            id="months"
            type="number"
            min="1"
            max="24"
            className="auth-input"
            value={months}
            onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: '90px' }}
          />
        </div>

        <div className="payment-row payment-total">
          <span>סך הכל לתשלום</span>
          <strong>₪{total}</strong>
        </div>

        <div className="payment-row payment-ref">
          <label htmlFor="ref">אסמכתא / מספר עסקה (אופציונלי)</label>
          <input
            id="ref"
            className="auth-input"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="יוזן אוטומטית כשמתחברים לסליקה"
            dir="ltr"
          />
        </div>

        <p className="payment-note">
          ⓘ זוהי תצורת פיתוח — אין כאן סליקה אמיתית. בלחיצה התשלום יסומן כשולם וניתן יהיה לחבר ספק סליקה אמיתי בהמשך.
        </p>

        <button type="button" className="btn-primary" onClick={handlePay} disabled={submitting}>
          {submitting ? 'מבצע תשלום...' : `חדש מודעה — ₪${total}`}
        </button>
      </div>
    </div>
  );
}

export default RenewApartmentPage;
