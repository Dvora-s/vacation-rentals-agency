import { useCallback, useEffect, useRef, useState } from 'react';
import PayPalCheckout from '../integrations/paypal/PayPalCheckout.jsx';
import { payForListing } from '../services/api.js';
import { createPayment } from '../services/paymentService.js';
import { PAYME_LISTING_STORAGE_KEY } from '../hooks/usePayMeListingReturn.js';
import './styles/PaymentMethodSelector.css';

/** לוגו PayPal רשמי (מארח PayPal) — לפי הנחיות המותג לכפתורי תשלום */
const PAYPAL_LOGO_URL =
  'https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png';

function paypalCaptureRef(result) {
  const cap = result?.purchase_units?.[0]?.payments?.captures?.[0];
  return cap?.id || result?.id || 'paypal';
}

/**
 * בחירת תשלום: PayPal או PayMe בלבד.
 *
 * @param {string} paymeReturnPath — נתיב חזרה אחרי PayMe (חובה כדי להציג PayMe).
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
  /** @type {'renew_apartment' | 'list_apartment'} */
  paymeFlow = 'renew_apartment',
}) {
  const hasPayPalClient = Boolean(String(import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim());
  const hasPayMePath = Boolean(paymeReturnPath && String(paymeReturnPath).trim());

  const [method, setMethod] = useState(() => {
    if (hasPayPalClient) return 'paypal';
    if (hasPayMePath) return 'payme';
    return 'none';
  });
  const [paypalWorking, setPaypalWorking] = useState(false);
  const [paymeWorking, setPaymeWorking] = useState(false);
  const [localError, setLocalError] = useState(null);
  const paypalSectionRef = useRef(null);
  const paymeSectionRef = useRef(null);
  const paymeExtraRef = useRef(paymePendingExtra);
  paymeExtraRef.current = paymePendingExtra;

  const totalStr = Number(totalIls).toFixed(2);

  const startPayMeCard = useCallback(async () => {
    setLocalError(null);
    setPaymeWorking(true);
    try {
      const origin = window.location.origin;
      const basePath = String(paymeReturnPath).split('?')[0];
      const returnUrl = `${origin}${basePath}`;
      const cancelUrl = `${origin}${basePath}${basePath.includes('?') ? '&' : '?'}payme_cancel=1`;

      try {
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
      } catch {
        throw new Error('לא ניתן לשמור פרטי עסקה בדפדפן — בדקו שאינכם במצב פרטי חוסם אחסון.');
      }

      const data = await createPayment({
        amount: Number(totalIls),
        currency: currencyCode,
        description: `פרסום דירה #${apartmentId} (${months} חודשים, ${tier})`,
        metadata: {
          apartment_id: Number(apartmentId),
          months: Number(months),
          tier: String(tier),
          purpose: 'listing_publication',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });
      const url = data?.checkoutUrl;
      if (!url) throw new Error('השרת לא החזיר כתובת תשלום PayMe');
      window.location.assign(url);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
      setPaymeWorking(false);
    }
  }, [apartmentId, months, tier, totalIls, currencyCode, paymeReturnPath, paymeFlow]);

  useEffect(() => {
    if (method === 'paypal' && paypalSectionRef.current) {
      paypalSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (method === 'payme' && paymeSectionRef.current) {
      paymeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [method]);

  const showChooser = hasPayPalClient || hasPayMePath;

  return (
    <div className="payment-method-selector" dir="rtl">
      {!showChooser && (
        <div className="auth-error" role="alert">
          לא הוגדרו אמצעי תשלום: הוסיפו <code>VITE_PAYPAL_CLIENT_ID</code> ב־<code>client/.env</code> ו/או ודאו
          שמועבר <code>paymeReturnPath</code> וש־PayMe מוגדר בשרת (<code>PAYME_BASE_URL</code> וכו׳). ראו{' '}
          <code>docs/PAYMENT_ENV.md</code>.
        </div>
      )}

      {showChooser && (
        <>
          <p className="payment-method-selector__title">בחרו איך לשלם</p>
          <div className="pay-tiles" role="group" aria-label="אמצעי תשלום">
            {hasPayPalClient && (
              <button
                type="button"
                className={`pay-tile pay-tile--paypal ${method === 'paypal' ? 'is-selected' : ''}`}
                onClick={() => {
                  setMethod('paypal');
                  setLocalError(null);
                }}
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
                onClick={() => {
                  setMethod('payme');
                  setLocalError(null);
                }}
                aria-pressed={method === 'payme'}
              >
                <span className="pay-tile__card-icon" aria-hidden="true">
                  💳
                </span>
                <span className="pay-tile__label">כרטיס אשראי (PayMe)</span>
                <span className="pay-tile__sub">
                  סליקה מאובטחת דרך PayMe — לחצו כאן ואז על &quot;המשך לתשלום&quot; למטה
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {localError && <div className="auth-error">{localError}</div>}

      {!hasPayPalClient && showChooser && (
        <p className="payment-method-selector__missing-paypal">
          אופציית PayPal מוסתרת כי חסר <code>VITE_PAYPAL_CLIENT_ID</code> ב־<code>client/.env</code> (בלי רווח אחרי{' '}
          <code>=</code>). שמרו את הקובץ והפעילו מחדש את Vite.
        </p>
      )}

      {method === 'paypal' && hasPayPalClient && (
        <div className="payment-method-selector__paypal" ref={paypalSectionRef}>
          <p className="payment-method-selector__paypal-intro">
            סכום לתשלום ב־PayPal: <strong>₪{totalStr}</strong> ({currencyCode})
          </p>
          <p className="payment-method-selector__paypal-hint">
            השתמשו בכפתור PayPal למטה — זה ממשק התשלום הרשמי של PayPal (חלון מאובטח).
          </p>
          <PayPalCheckout
            key={`${apartmentId}-${totalStr}-${currencyCode}`}
            currencyCode={currencyCode}
            fixedAmount={totalStr}
            brandedPayPalOnly
            onCaptureSuccess={async (result) => {
              setLocalError(null);
              setPaypalWorking(true);
              try {
                await payForListing({
                  apartment_id: apartmentId,
                  months,
                  tier,
                  provider: 'paypal',
                  provider_reference: paypalCaptureRef(result),
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

      {method === 'payme' && hasPayMePath && (
        <div className="payment-method-selector__payme" ref={paymeSectionRef}>
          <p className="payment-method-selector__payme-intro">
            סכום לתשלום בכרטיס אשראי: <strong>₪{totalStr}</strong> ({currencyCode}) — דרך <strong>PayMe</strong>
          </p>
          <p className="payment-method-selector__payme-hint">
            תועברו לאתר התשלום של PayMe. לאחר סיום מוצלח, תחזרו לעמוד זה והמערכת תשלים את רישום התשלום אוטומטית.
          </p>
          <button
            type="button"
            className="btn-primary payment-method-selector__payme-btn"
            onClick={startPayMeCard}
            disabled={paymeWorking || paypalWorking}
          >
            {paymeWorking ? 'מכין תשלום…' : 'המשך לתשלום בכרטיס אשראי (PayMe)'}
          </button>
        </div>
      )}
    </div>
  );
}
