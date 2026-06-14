import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getApartmentById, getListingFee } from '../services/api';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { usePayMeListingReturn } from '../hooks/usePayMeListingReturn';
import { requiresPremium } from '../data/pricing';
import './ListApartmentPage.css';

function RenewApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fee, setFee] = useState({ amount_per_month: 30, currency: 'ILS' });
  const [months, setMonths] = useState(1);
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

  const renewTier = apartment && requiresPremium(apartment) ? 'premium' : 'standard';

  useEffect(() => {
    if (searchParams.get('payme_cancel') === '1') {
      setError('תשלום PayMe בוטל או לא הושלם.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  usePayMeListingReturn({
    validatePending: useCallback(
      (p) => p.flow === 'renew_apartment' && Number(p.apartmentId) === Number(id),
      [id],
    ),
    onPaid: useCallback(() => setDone(true), []),
    onError: useCallback((msg) => setError(msg), []),
  });

  if (loading) return <p className="loading-text section-container">טוען...</p>;

  if (done) {
    return (
      <div className="list-apt-page section-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>המודעה חודשה!</h1>
          <p>תוקף הפרסום הוארך והמודעה חזרה לאוויר. תודה שחידשתם את הפרסום.</p>
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

        <p className="payment-note">
          ⓘ התשלום מתבצע דרך <strong>PayPal</strong> או <strong>PayMe</strong> בלבד; אסמכתא נרשמת אוטומטית מהספק.
        </p>

        <PaymentMethodSelector
          totalIls={total}
          currencyCode="ILS"
          apartmentId={Number(id)}
          months={months}
          tier={renewTier}
          paymeReturnPath={`/my-apartments/${id}/renew`}
          paymeFlow="renew_apartment"
          onSuccess={() => setDone(true)}
        />
      </div>
    </div>
  );
}

export default RenewApartmentPage;
