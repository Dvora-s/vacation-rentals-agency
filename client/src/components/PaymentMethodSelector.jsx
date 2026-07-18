import { useCallback, useEffect, useRef, useState } from 'react';
import PayPalCheckout from '../integrations/paypal/PayPalCheckout.jsx';
import PayMeHostedFields from '../integrations/payme/PayMeHostedFields.jsx';
import PolicyConsentCheckbox from './PolicyConsentCheckbox.jsx';
import { payForListing, getToken } from '../services/api.js';
import { createPaymentSession, ilsToAgorot } from '../services/paymentService.js';
import { PAYME_LISTING_STORAGE_KEY } from '../hooks/usePayMeListingReturn.js';
import './styles/PaymentMethodSelector.css';

const PAYPAL_LOGO_URL =
  'https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png';

function paypalAuthorizeRef(result) {
  const auth = result?.purchase_units?.[0]?.payments?.authorizations?.[0];
  return auth?.id ? `auth:${auth.id}` : null;
}

/**
 * בחירת תשלום: PayPal או PayMe (טופס מוטמע באתר + גיבוי לדף מלא).
 */
export default function PaymentMethodSelector({
  totalIls,
  currencyCode = 'ILS',
  apartmentId,
  months,
  tier,
  onSuccess,
  paymeReturnPath,
  paymePendingExtra = {},
  paymeFlow = 'renew_apartment',
}) {
  const hasPayPalClient = Boolean(String(import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim());
  const hasPayMePath = Boolean(paymeReturnPath && String(paymeReturnPath).trim());
  const hasAuthToken = Boolean(getToken());

  const [method, setMethod] = useState(() => {
    if (hasPayPalClient) return 'paypal';
    if (hasPayMePath) return 'payme';
    return 'none';
  });
  const [paypalWorking, setPaypalWorking] = useState(false);
  const [paymeStarted, setPaymeStarted] = useState(false);
  const [paymeFullPageWorking, setPaymeFullPageWorking] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [policyConsent, setPolicyConsent] = useState(false);
  const [policyConsentError, setPolicyConsentError] = useState(null);
  const paypalSectionRef = useRef(null);
  const paymeSectionRef = useRef(null);
  const paymeExtraRef = useRef(paymePendingExtra);
  paymeExtraRef.current = paymePendingExtra;

  function requirePolicyConsent() {
    if (!policyConsent) {
      setPolicyConsentError('יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני התשלום');
      return false;
    }
    setPolicyConsentError(null);
    return true;
  }

  function selectMethod(next) {
    if (!requirePolicyConsent()) return;
    setMethod(next);
    setLocalError(null);
    if (next !== 'payme') setPaymeStarted(false);
  }

  function savePayMePending() {
    sessionStorage.setItem(
      PAYME_LISTING_STORAGE_KEY,
      JSON.stringify({
        apartmentId: Number(apartmentId),
        months: Number(months),
        tier: String(tier),
        flow: paymeFlow,
        ...(paymeExtraRef.current && typeof paymeExtraRef.current === 'object' ? paymeExtraRef.current : {}),
      }),
    );
  }

  const startPayMeEmbedded = useCallback(() => {
    if (!requirePolicyConsent()) return;
    setLocalError(null);
    try {
      savePayMePending();
    } catch {
      setLocalError('לא ניתן לשמור פרטי עסקה בדפדפן — בדקו שאינכם במצב פרטי חוסם אחסון.');
      return;
    }
    setPaymeStarted(true);
  }, [apartmentId, months, tier, paymeFlow, policyConsent]);

  /** Fallback: full-page PayMe (better for some banks' 3D Secure). */
  const startPayMeFullPage = useCallback(async () => {
    if (!requirePolicyConsent()) return;
    setLocalError(null);
    setPaymeFullPageWorking(true);

    const origin = window.location.origin;
    const basePath = String(paymeReturnPath).split('?')[0];
    const returnUrl = `${origin}${basePath}`;
    const cancelUrl = `${origin}${basePath}${basePath.includes('?') ? '&' : '?'}payme_cancel=1`;

    try {
      savePayMePending();
      const session = await createPaymentSession({
        price: ilsToAgorot(totalIls),
        currency: currencyCode,
        product_name: `פרסום דירה #${apartmentId} (${months} חודשים, ${tier})`,
        metadata: {
          apartment_id: Number(apartmentId),
          months: Number(months),
          tier: String(tier),
          purpose: 'listing_publication',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });
      const url = session?.saleUrl;
      if (!url) throw new Error('השרת לא החזיר כתובת תשלום PayMe');
      window.location.assign(url);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
      setPaymeFullPageWorking(false);
    }
  }, [
    apartmentId,
    months,
    tier,
    totalIls,
    currencyCode,
    paymeReturnPath,
    paymeFlow,
    policyConsent,
  ]);

  const handlePayMePaid = useCallback(
    async ({ paymentId, paymeSaleId }) => {
      setLocalError(null);
      try {
        await payForListing({
          apartment_id: apartmentId,
          months,
          tier,
          provider: 'payme',
          provider_reference: paymeSaleId || `payme:${paymentId}`,
        });
        try {
          sessionStorage.removeItem(PAYME_LISTING_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        onSuccess?.();
      } catch (e) {
        setLocalError(e?.message || String(e));
      }
    },
    [apartmentId, months, tier, onSuccess],
  );

  useEffect(() => {
    if (method === 'paypal' && paypalSectionRef.current) {
      paypalSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (method === 'payme' && paymeSectionRef.current) {
      paymeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [method]);

  const showChooser = hasPayPalClient || hasPayMePath;
  const totalStr = Number(totalIls).toFixed(2);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = String(paymeReturnPath || '').split('?')[0];

  return (
    <div className="payment-method-selector" dir="rtl">
      {!showChooser && (
        <div className="auth-error" role="alert">
          לא הוגדרו אמצעי תשלום: הוסיפו <code>VITE_PAYPAL_CLIENT_ID</code> ב־<code>client/.env</code> ו/או ודאו
          שמועבר <code>paymeReturnPath</code> וש־PayMe מוגדר בשרת. ראו <code>docs/PAYMENT_ENV.md</code>.
        </div>
      )}

      {showChooser && !hasAuthToken && (
        <div className="auth-error" role="alert">
          יש להתחבר לאתר לפני התשלום. אם כבר התחברתם — התנתקו והתחברו מחדש, ואז נסו שוב.
        </div>
      )}

      {showChooser && hasAuthToken && (
        <>
          <PolicyConsentCheckbox
            id={`policy-consent-${apartmentId}`}
            checked={policyConsent}
            onChange={(checked) => {
              setPolicyConsent(checked);
              if (checked) setPolicyConsentError(null);
            }}
            error={policyConsentError}
          />
          <p className="payment-method-selector__title">בחרו איך לשלם</p>
          <div className="pay-tiles" role="group" aria-label="אמצעי תשלום">
            {hasPayPalClient && (
              <button
                type="button"
                className={`pay-tile pay-tile--paypal ${method === 'paypal' ? 'is-selected' : ''}`}
                onClick={() => selectMethod('paypal')}
                aria-pressed={method === 'paypal'}
              >
                <span className="pay-tile__paypal-mark" aria-hidden="true">
                  <img src={PAYPAL_LOGO_URL} alt="" width={140} height={36} loading="lazy" />
                </span>
                <span className="pay-tile__label">שלמו עם PayPal</span>
                <span className="pay-tile__sub">
                  חשבון PayPal או כרטיס דרך הממשק של PayPal (חלון מאובטח)
                </span>
              </button>
            )}

            {hasPayMePath && (
              <button
                type="button"
                className={`pay-tile pay-tile--payme ${method === 'payme' ? 'is-selected' : ''}`}
                onClick={() => selectMethod('payme')}
                aria-pressed={method === 'payme'}
              >
                <span className="pay-tile__card-icon" aria-hidden="true">
                  💳
                </span>
                <span className="pay-tile__label">כרטיס אשראי (PayMe)</span>
                <span className="pay-tile__sub">
                  הזנת פרטי כרטיס בטופס מאובטח בתוך האתר
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {localError && <div className="auth-error">{localError}</div>}

      {!hasPayPalClient && showChooser && (
        <p className="payment-method-selector__missing-paypal">
          אופציית PayPal מוסתרת כי חסר <code>VITE_PAYPAL_CLIENT_ID</code> ב־<code>client/.env</code>.
        </p>
      )}

      {method === 'paypal' && hasPayPalClient && policyConsent && hasAuthToken && (
        <div className="payment-method-selector__paypal" ref={paypalSectionRef}>
          <p className="payment-method-selector__paypal-intro">
            סכום לתשלום ב־PayPal: <strong>₪{totalStr}</strong> ({currencyCode})
          </p>
          <p className="payment-method-selector__paypal-hint">
            השתמשו בכפתור PayPal למטה. התשלום יאושר עכשיו, והחיוב בפועל יתבצע רק כשהמנהל יאשר את המודעה.
          </p>
          <PayPalCheckout
            key={`${apartmentId}-${totalStr}-${currencyCode}`}
            currencyCode={currencyCode}
            fixedAmount={totalStr}
            brandedPayPalOnly
            paymentIntent="authorize"
            onCaptureSuccess={async (result) => {
              setLocalError(null);
              setPaypalWorking(true);
              try {
                const ref = paypalAuthorizeRef(result);
                if (!ref) throw new Error('לא התקבלה אסמכתא אישור תשלום מ־PayPal');
                await payForListing({
                  apartment_id: apartmentId,
                  months,
                  tier,
                  provider: 'paypal',
                  provider_reference: ref,
                });
                onSuccess?.();
              } catch (e) {
                setLocalError(e?.message || String(e));
              } finally {
                setPaypalWorking(false);
              }
            }}
            onError={(err) => setLocalError(err?.message || String(err))}
          />
        </div>
      )}

      {method === 'payme' && hasPayMePath && policyConsent && hasAuthToken && (
        <div className="payment-method-selector__payme" ref={paymeSectionRef}>
          <p className="payment-method-selector__payme-intro">
            סכום לתשלום בכרטיס אשראי: <strong>₪{totalStr}</strong> ({currencyCode}) — דרך <strong>PayMe</strong>
          </p>
          <p className="payment-method-selector__payme-hint">
            הטופס המאובטח יוצג כאן באתר. אם הבנק דורש אימות וזה נכשל — השתמשו באפשרות &quot;דף תשלום מלא&quot;.
          </p>

          {!paymeStarted ? (
            <div className="payment-method-selector__payme-actions">
              <button
                type="button"
                className="btn-primary payment-method-selector__payme-btn"
                onClick={startPayMeEmbedded}
                disabled={paypalWorking || paymeFullPageWorking || !policyConsent}
              >
                המשך לתשלום בכרטיס אשראי (PayMe)
              </button>
            </div>
          ) : (
            <>
              <PayMeHostedFields
                key={`payme-${apartmentId}-${totalStr}`}
                totalIls={totalIls}
                currencyCode={currencyCode}
                productName={`פרסום דירה #${apartmentId} (${months} חודשים, ${tier})`}
                metadata={{
                  apartment_id: Number(apartmentId),
                  months: Number(months),
                  tier: String(tier),
                  purpose: 'listing_publication',
                }}
                returnUrl={`${origin}${basePath}`}
                cancelUrl={`${origin}${basePath}${basePath.includes('?') ? '&' : '?'}payme_cancel=1`}
                autoStart
                onPaid={handlePayMePaid}
                onError={(msg) => setLocalError(msg)}
              />
              <button
                type="button"
                className="payment-method-selector__payme-fullpage"
                onClick={startPayMeFullPage}
                disabled={paymeFullPageWorking}
              >
                {paymeFullPageWorking ? 'מכין…' : 'לא עובד? פתיחה בדף תשלום מלא של PayMe'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
