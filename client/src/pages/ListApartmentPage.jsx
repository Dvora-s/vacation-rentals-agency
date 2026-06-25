import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ApartmentForm from '../components/ApartmentForm';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import {
  createApartment,
  getApartmentById,
  adminPublishApartmentFree,
  getAvailableListingSlots,
  payForListing,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePayMeListingReturn } from '../hooks/usePayMeListingReturn';
import { useCheckoutPlans } from '../hooks/useCheckoutPlans';
import { PREMIUM_PLANS, STANDARD_PLANS, requiresPremium } from '../data/pricing';
import './ListApartmentPage.css';

function ListApartmentPage() {
  const { user, isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedPlan = location.state?.plan || null;

  const [step, setStep] = useState('details');
  const [createdApt, setCreatedApt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [tier, setTier] = useState(selectedPlan?.tier || 'standard');
  const [planId, setPlanId] = useState(null);
  const [premiumForced, setPremiumForced] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [publishBusy, setPublishBusy] = useState(false);

  const confirmSubmittedAfterPayment = useCallback(async (apartmentId) => {
    const apt = await getApartmentById(apartmentId);
    if (apt.status !== 'pending') {
      throw new Error('השליחה לאישור טרם הושלמה. נסו שוב בעוד רגע או פנו לתמיכה.');
    }
    setCreatedApt(apt);
    setPaymentComplete(true);
    setStep('done');
  }, []);

  const { plans: checkoutPlans, loading: plansLoading } = useCheckoutPlans(tier);

  useEffect(() => {
    if (searchParams.get('payme_cancel') === '1') {
      setError('תשלום PayMe בוטל או לא הושלם.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const resumePaymentForApartment = useCallback(
    async (apt) => {
      const mustPremium = requiresPremium(apt);
      const effectiveTier = mustPremium ? 'premium' : 'standard';
      const fallbackList = effectiveTier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
      let initialPlanId = fallbackList[0].id;
      if (selectedPlan) {
        const match = fallbackList.find((p) => p.months === selectedPlan.months);
        if (match) initialPlanId = match.id;
      }
      setCreatedApt(apt);
      setTier(effectiveTier);
      setPlanId(initialPlanId);
      setPremiumForced(mustPremium && (selectedPlan?.tier || 'standard') !== 'premium');
      setStep('payment');
    },
    [selectedPlan],
  );

  useEffect(() => {
    if (!planId && checkoutPlans.length > 0) {
      setPlanId(checkoutPlans[0].id);
    }
  }, [checkoutPlans, planId]);

  useEffect(() => {
    if (step !== 'payment' || !user) return undefined;
    refresh().catch(() => {});
    let active = true;
    (async () => {
      try {
        const slots = await getAvailableListingSlots(tier);
        if (active) setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch {
        if (active) setAvailableSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [step, tier, user, refresh]);

  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (!resumeId || !user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const apt = await getApartmentById(resumeId);
        if (cancelled) return;
        if (apt.status !== 'awaiting_payment' && apt.status !== 'expired') {
          setError('הדירה אינה ממתינה לתשלום. בדקו את הסטטוס ב"הדירות שלי".');
          return;
        }
        if (isAdmin && apt.status === 'awaiting_payment') {
          const submitted = await adminPublishApartmentFree(apt.id);
          setCreatedApt(submitted);
          setPaymentComplete(true);
          setStep('done');
          return;
        }
        await resumePaymentForApartment(apt);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user, isAdmin, resumePaymentForApartment]);

  usePayMeListingReturn({
    validatePending: useCallback((p) => p.flow === 'list_apartment' && Number(p.apartmentId) > 0, []),
    onPaid: useCallback(
      async (pending) => {
        try {
          await confirmSubmittedAfterPayment(pending.apartmentId);
        } catch (err) {
          setError(err.message);
        }
      },
      [confirmSubmittedAfterPayment],
    ),
    onError: useCallback((msg) => setError(msg), []),
  });

  const detailsSubtitle = isAdmin
    ? 'מלאו את פרטי הדירה ושלחו — המודעה תעלה לאתר מיד, ללא תשלום וללא המתנה לאישור.'
    : 'מלאו את פרטי הדירה, שלמו, ואז המודעה תישלח לאישור המנהל. רק לאחר האישור היא תעלה לאתר.';

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

      if (isAdmin && apt.status === 'approved') {
        setCreatedApt(apt);
        setPaymentComplete(true);
        setStep('done');
        return;
      }

      const mustPremium = requiresPremium(apt);
      const effectiveTier = mustPremium ? 'premium' : 'standard';
      const fallbackList = effectiveTier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
      let initialPlanId = fallbackList[0].id;
      if (selectedPlan) {
        const match = fallbackList.find((p) => p.months === selectedPlan.months);
        if (match) initialPlanId = match.id;
      }

      setCreatedApt(apt);
      setTier(effectiveTier);
      setPlanId(initialPlanId);
      setPremiumForced(mustPremium && (selectedPlan?.tier || 'standard') !== 'premium');
      setPaymentComplete(false);
      setStep('payment');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const planList = checkoutPlans.length > 0 ? checkoutPlans : tier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
  const chosenPlan = planList.find((p) => p.id === planId) || planList[0];
  const total = Number(chosenPlan?.price ?? 0);
  const isFreePromo = total <= 0;
  const isRenewal = createdApt?.status === 'expired';

  async function handlePublishFree() {
    if (!chosenPlan || !createdApt?.id) return;
    setPublishBusy(true);
    setError(null);
    try {
      await payForListing({
        apartment_id: createdApt.id,
        months: chosenPlan.months,
        tier,
        provider: 'promo_free',
        provider_reference: 'promo-zero',
      });
      await confirmSubmittedAfterPayment(createdApt.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleUseSlot(slotId) {
    if (!chosenPlan || !createdApt?.id) return;
    setPublishBusy(true);
    setError(null);
    try {
      await payForListing({
        apartment_id: createdApt.id,
        months: chosenPlan.months,
        tier,
        listing_payment_id: slotId,
      });
      await confirmSubmittedAfterPayment(createdApt.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleAdminSubmitFree() {
    if (!createdApt?.id) return;
    setPublishBusy(true);
    setError(null);
    try {
      const submitted = await adminPublishApartmentFree(createdApt.id);
      setCreatedApt(submitted);
      setPaymentComplete(true);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishBusy(false);
    }
  }

  if (step === 'done') {
    const adminPublished = isAdmin && createdApt?.status === 'approved';
    return (
      <div className="list-apt-page section-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>{adminPublished ? 'הדירה פורסמה באתר' : 'הדירה נשלחה לאישור'}</h1>
          <p>
            {adminPublished
              ? 'המודעה פעילה באתר וניתן לצפות בה מיד.'
              : paymentComplete
                ? 'שילמתם והמודעה נשלחה לאישור המנהל. לאחר האישור היא תעלה לאתר ותקבלו הודעה במייל.'
                : 'המודעה נשלחה לאישור המנהל.'}
          </p>
          <div className="success-actions">
            {adminPublished && createdApt?.id && (
              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => navigate(`/apartments/${createdApt.id}`)}
              >
                צפייה בדירה
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => navigate('/my-apartments')}>
              לדירות שלי
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="list-apt-page list-apt-page--payment section-container">
        <h1 className="page-title">{isRenewal ? 'חידוש פרסום — תשלום' : 'תשלום ושליחה לאישור'}</h1>
        <p className="page-subtitle">
          {isRenewal ? (
            <>
              תוקף הפרסום של <strong>"{createdApt?.title}"</strong> פג. השלימו תשלום כדי לשלוח שוב לאישור
              המנהל — המודעה תעלה לאתר רק לאחר האישור.
            </>
          ) : (
            <>
              הדירה <strong>"{createdApt?.title}"</strong> נשמרה. בחרו מסלול והשלימו תשלום — לאחר מכן המודעה
              תישלח לאישור המנהל, ורק כשהאישור יתבצע היא תעלה לאתר.
            </>
          )}
        </p>

        {error && <div className="auth-error">{error}</div>}

        {premiumForced && (
          <div className="auth-notice">
            הנכס שלכם הוא <strong>מתחם אירוח</strong>, ולכן חלים עליו מסלולי החבילות של מתחמי אירוח.
          </div>
        )}

        {isAdmin && !isRenewal && createdApt?.status === 'awaiting_payment' && (
          <div className="auth-notice" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.75rem' }}>מנהל: ניתן לפרסם את הדירה מיד ללא תשלום.</p>
            <button
              type="button"
              className="btn-outline-gold"
              disabled={publishBusy}
              onClick={handleAdminSubmitFree}
            >
              {publishBusy ? 'מפרסם...' : 'פרסום מיידי באתר'}
            </button>
          </div>
        )}

        <div className="payment-card">
          <h3>{tier === 'premium' ? 'מסלולי מלונות ומתחמי אירוח' : 'בחירת מסלול פרסום'}</h3>

          {plansLoading && <p className="loading-text">טוען מחירים...</p>}

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
                  <span className="plan-option-title">
                    {plan.title}
                    {plan.listingSlots > 1 ? ` · עד ${plan.listingSlots} דירות` : ''}
                  </span>
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
            <strong>{isFreePromo ? 'ללא תשלום (מבצע)' : `₪${total}`}</strong>
          </div>

          {availableSlots.length > 0 && (
            <div className="auth-notice" style={{ marginTop: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem' }}>
                יש לכם מסלול פעיל עם מקום פנוי — אפשר לשלוח דירה זו לאישור בלי תשלום נוסף:
              </p>
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className="btn-outline-gold"
                  style={{ marginLeft: '0.5rem', marginBottom: '0.5rem' }}
                  disabled={publishBusy}
                  onClick={() => handleUseSlot(slot.id)}
                >
                  שליחה לאישור עם המסלול ({slot.slots_remaining} דירות נותרו)
                </button>
              ))}
            </div>
          )}

          {isFreePromo ? (
            <>
              <p className="payment-note">
                מבצע פעיל — אין צורך בתשלום. לחצו לשליחת המודעה לאישור המנהל.
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={publishBusy || !chosenPlan}
                onClick={handlePublishFree}
              >
                {publishBusy ? 'שולח...' : 'שליחה לאישור'}
              </button>
            </>
          ) : (
            <>
              <p className="payment-note">
                ⓘ PayPal: אישור תשלום עכשיו, חיוב בפועל עם אישור המנהל. PayMe: חיוב מיידי בכרטיס.
                לאחר השלמה המודעה תישלח לאישור.
              </p>
              {chosenPlan && (
                <PaymentMethodSelector
                  totalIls={total}
                  currencyCode="ILS"
                  apartmentId={createdApt.id}
                  months={chosenPlan.months}
                  tier={tier}
                  paymeReturnPath="/list-apartment"
                  paymeFlow="list_apartment"
                  paymePendingExtra={{ apartmentTitle: createdApt.title }}
                  onSuccess={async () => {
                    try {
                      await confirmSubmittedAfterPayment(createdApt.id);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                />
              )}
            </>
          )}
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
