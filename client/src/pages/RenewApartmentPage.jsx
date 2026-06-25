import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getApartmentById } from '../services/api';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { usePayMeListingReturn } from '../hooks/usePayMeListingReturn';
import { useCheckoutPlans } from '../hooks/useCheckoutPlans';
import { requiresPremium } from '../data/pricing';
import './ListApartmentPage.css';

function RenewApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const renewTier = apartment && requiresPremium(apartment) ? 'premium' : 'standard';
  const { plans: checkoutPlans, loading: plansLoading } = useCheckoutPlans(renewTier);

  useEffect(() => {
    getApartmentById(id)
      .then((apt) => {
        if (apt.status !== 'expired') {
          throw new Error('ניתן לחדש רק מודעות שפג תוקפן.');
        }
        setApartment(apt);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!planId && checkoutPlans.length > 0) {
      setPlanId(checkoutPlans[0].id);
    }
  }, [checkoutPlans, planId]);

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

  const chosenPlan = checkoutPlans.find((p) => p.id === planId) || checkoutPlans[0];
  const total = chosenPlan?.price ?? 0;

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">חידוש פרסום המודעה</h1>
      <p className="page-subtitle">
        חידוש הפרסום של <strong>"{apartment?.title}"</strong>. לאחר התשלום המודעה תחזור להופיע באתר.
      </p>

      {error && <div className="auth-error">{error}</div>}

      <div className="payment-card">
        <h3>בחירת מסלול חידוש</h3>

        {plansLoading && <p className="loading-text">טוען מחירים...</p>}

        <div className="plan-options">
          {checkoutPlans.map((plan) => (
            <label
              key={plan.id}
              className={`plan-option ${planId === plan.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="renew-plan"
                value={plan.id}
                checked={planId === plan.id}
                onChange={() => setPlanId(plan.id)}
              />
              <span className="plan-option-body">
                <span className="plan-option-title">{plan.title}</span>
                <span className="plan-option-price">
                  {plan.originalPrice != null && (
                    <span className="plan-option-old">₪{plan.originalPrice}</span>
                  )}
                  ₪{plan.price}
                </span>
              </span>
              {plan.badge && <span className="plan-option-badge">{plan.badge}</span>}
            </label>
          ))}
        </div>

        <div className="payment-row payment-total">
          <span>סך הכל לתשלום</span>
          <strong>₪{total}</strong>
        </div>

        <p className="payment-note">
          ⓘ התשלום מתבצע דרך <strong>PayPal</strong> או <strong>PayMe</strong> בלבד; אסמכתא נרשמת אוטומטית מהספק.
        </p>

        {chosenPlan && (
          <PaymentMethodSelector
            totalIls={total}
            currencyCode="ILS"
            apartmentId={Number(id)}
            months={chosenPlan.months}
            tier={renewTier}
            paymeReturnPath={`/my-apartments/${id}/renew`}
            paymeFlow="renew_apartment"
            onSuccess={() => setDone(true)}
          />
        )}
      </div>
    </div>
  );
}

export default RenewApartmentPage;
