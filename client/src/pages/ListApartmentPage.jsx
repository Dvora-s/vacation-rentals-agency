import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApartmentForm from '../components/ApartmentForm';
import { createApartment, payForListing } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  STANDARD_PLANS,
  PREMIUM_PLANS,
  getPlanAmount,
  requiresPremium,
  monthsLabel,
} from '../data/pricing';
import './ListApartmentPage.css';

function ListApartmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // מסלול שנבחר במחירון (אם הגיעו דרך "בחירת מסלול").
  const selectedPlan = location.state?.plan || null;

  const [step, setStep] = useState('details'); // details → payment → done
  const [createdApt, setCreatedApt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [tier, setTier] = useState(selectedPlan?.tier || 'standard');
  const [planId, setPlanId] = useState(null);
  const [premiumForced, setPremiumForced] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const detailsSubtitle = selectedPlan
    ? `מלאו את פרטי הדירה. בשלב הבא תועברו לתשלום של ₪${getPlanAmount(
        selectedPlan.tier,
        selectedPlan.months,
      )} ל${monthsLabel(selectedPlan.months)}, ולאחר מכן המנהל יאשר את הפרסום.`
    : 'מלאו את פרטי הדירה. בשלב הבא תבחרו מסלול תשלום, ולאחר מכן המנהל יאשר את הפרסום.';

  async function handleCreate(payload) {
    setError(null);
    setSubmitting(true);
    try {
      const apt = await createApartment({
        ...payload,
        owner_name: payload.owner_name || user?.full_name || null,
        owner_email: payload.owner_email || user?.email || null,
        owner_phone: payload.owner_phone || user?.phone || null,
      });
      setCreatedApt(apt);

      // תעריף נקבע לפי סוג הנכס: "מתחמי אירוח" => פרימיום.
      const mustPremium = requiresPremium(apt);
      const effectiveTier = mustPremium ? 'premium' : 'standard';
      const planList = effectiveTier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;

      // ברירת מחדל: המסלול שנבחר במחירון (אם תואם ל-tier), אחרת הראשון ברשימה.
      let initialPlanId = planList[0].id;
      if (selectedPlan) {
        const match = planList.find((p) => p.months === selectedPlan.months);
        if (match) initialPlanId = match.id;
      }

      setTier(effectiveTier);
      setPlanId(initialPlanId);
      setPremiumForced(mustPremium && (selectedPlan?.tier || 'standard') !== 'premium');
      setStep('payment');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const planList = tier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
  const chosenPlan = planList.find((p) => p.id === planId) || planList[0];

  async function handlePay() {
    setError(null);
    setSubmitting(true);
    try {
      await payForListing({
        apartment_id: createdApt.id,
        months: chosenPlan.months,
        tier,
        provider_reference: paymentRef || null,
      });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="list-apt-page section-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>הדירה נשלחה לאישור</h1>
          <p>
            התשלום התקבל והפרסום ימתין לאישור המנהל. ברגע שהדירה תאושר היא תופיע בעמוד "חיפוש דירה".
          </p>
          <div className="success-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/my-apartments')}
            >
              לדירות שלי
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    const total = chosenPlan.price;
    return (
      <div className="list-apt-page section-container">
        <h1 className="page-title">תשלום על פרסום הדירה</h1>
        <p className="page-subtitle">
          הדירה <strong>"{createdApt?.title}"</strong> נשמרה. בחרו מסלול פרסום כדי להעביר אותה לאישור המנהל.
        </p>

        {error && <div className="auth-error">{error}</div>}

        {premiumForced && (
          <div className="auth-notice">
            הנכס שלכם הוא <strong>מתחם אירוח</strong>, ולכן חלים עליו מסלולי החבילות של מתחמי אירוח.
          </div>
        )}

        <div className="payment-card">
          <h3>
            {tier === 'premium' ? 'מסלולי מתחמי אירוח' : 'בחירת מסלול פרסום'}
          </h3>

          <div className="plan-options">
            {planList.map((plan) => (
              <label
                key={plan.id}
                className={`plan-option ${planId === plan.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={planId === plan.id}
                  onChange={() => setPlanId(plan.id)}
                />
                <span className="plan-option-body">
                  <span className="plan-option-title">{plan.title}</span>
                  <span className="plan-option-price">
                    {plan.originalPrice && (
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

          <button
            type="button"
            className="btn-primary"
            onClick={handlePay}
            disabled={submitting}
          >
            {submitting ? 'מבצע תשלום...' : `אישור תשלום של ₪${total}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">פרסום דירה חדשה</h1>
      <p className="page-subtitle">{detailsSubtitle}</p>

      <ApartmentForm
        onSubmit={handleCreate}
        submitting={submitting}
        error={error}
        submitLabel="המשך לתשלום"
      />
    </div>
  );
}

export default ListApartmentPage;
