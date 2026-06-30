import { useCallback, useEffect, useRef, useState } from 'react';
import { authorizePayPalOrder, capturePayPalOrder, createPayPalOrder, getToken } from '../../services/api.js';
import './PayPalCheckout.css';

const clientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim();
const payPalMode = String(import.meta.env.VITE_PAYPAL_MODE ?? 'sandbox').trim().toLowerCase();
const payPalSdkHost =
  payPalMode === 'live' || payPalMode === 'production'
    ? 'https://www.paypal.com'
    : 'https://www.sandbox.paypal.com';

const isSandboxMode = payPalMode !== 'live' && payPalMode !== 'production';

/** Load official PayPal JS SDK from CDN (no extra npm package — avoids registry TLS issues). */
function loadPayPalScript(cid, currency, intent = 'capture') {
  const normalizedIntent = intent === 'authorize' ? 'authorize' : 'capture';
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-nofesh-paypal-sdk]');
    if (existing) {
      const existingIntent = existing.getAttribute('data-paypal-intent');
      if (existingIntent !== normalizedIntent) {
        delete window.paypal;
        existing.remove();
      } else if (typeof window !== 'undefined' && window.paypal) {
        resolve(window.paypal);
        return;
      } else {
        const done = () => {
          if (window.paypal) resolve(window.paypal);
          else reject(new Error('PayPal SDK loaded but window.paypal is missing'));
        };
        existing.addEventListener('load', done, { once: true });
        existing.addEventListener('error', () => reject(new Error('PayPal script failed')), { once: true });
        return;
      }
    }

    if (typeof window !== 'undefined' && window.paypal) {
      resolve(window.paypal);
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-nofesh-paypal-sdk', '1');
    script.setAttribute('data-paypal-intent', normalizedIntent);
    script.async = true;
    const params = new URLSearchParams({
      'client-id': cid,
      currency,
      intent: normalizedIntent,
      // Sandbox: en_US מונע לולאות רענון אזוריות ידועות; Live: עברית.
      locale: isSandboxMode ? 'en_US' : 'he_IL',
      components: 'buttons',
      'disable-funding': 'card,credit,paylater,venmo',
    });
    script.src = `${payPalSdkHost}/sdk/js?${params.toString()}`;
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error('PayPal SDK loaded but window.paypal is missing'));
    };
    script.onerror = () => reject(new Error('Could not load PayPal script (network or CSP)'));
    document.body.appendChild(script);
  });
}

/**
 * PayPal Smart Buttons: create order → backend → authorize/capture → callback.
 * @param {'capture'|'authorize'} [paymentIntent] — authorize = החיוב רק כשמנהל מאשר (listing).
 */
export default function PayPalCheckout({
  currencyCode = 'USD',
  defaultAmount = '10.00',
  fixedAmount = null,
  brandedPayPalOnly = false,
  paymentIntent = 'capture',
  onCaptureSuccess,
  onError,
}) {
  const locked =
    fixedAmount != null && String(fixedAmount).trim() !== '' && Number.isFinite(Number.parseFloat(fixedAmount));

  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState(locked ? String(fixedAmount) : defaultAmount);
  const amountRef = useRef(amount);
  amountRef.current = locked ? Number.parseFloat(String(fixedAmount)).toFixed(2) : amount;

  const buttonsHostRef = useRef(null);
  const onCaptureSuccessRef = useRef(onCaptureSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCaptureSuccessRef.current = onCaptureSuccess;
    onErrorRef.current = onError;
  }, [onCaptureSuccess, onError]);

  const reportError = useCallback((err) => {
    const text = err?.message || String(err);
    setMessage(text);
    onErrorRef.current?.(err);
  }, []);

  useEffect(() => {
    if (!clientId || !buttonsHostRef.current) return undefined;

    let cancelled = false;
    let buttonsInstance = null;
    const useAuthorize = paymentIntent === 'authorize';

    (async () => {
      try {
        const paypal = await loadPayPalScript(clientId, currencyCode, paymentIntent);
        if (cancelled || !buttonsHostRef.current) return;

        buttonsHostRef.current.innerHTML = '';

        const buttonOptions = {
          style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            setMessage('');
            if (!getToken()) {
              const err = new Error('פג תוקף ההתחברות. התחברו מחדש ואז נסו לשלם שוב.');
              reportError(err);
              throw err;
            }
            const value = Number.parseFloat(amountRef.current);
            if (!Number.isFinite(value) || value <= 0) {
              const err = new Error('סכום לא תקין');
              reportError(err);
              throw err;
            }
            const data = await createPayPalOrder({
              currency_code: currencyCode,
              value: value.toFixed(2),
              intent: useAuthorize ? 'authorize' : 'capture',
            });
            if (!data?.id && !data?.orderID) {
              const err = new Error('השרת לא החזיר מזהה הזמנה מ־PayPal');
              reportError(err);
              throw err;
            }
            return data.id || data.orderID;
          },
          onApprove: async (data) => {
            try {
              const result = useAuthorize
                ? await authorizePayPalOrder(data.orderID)
                : await capturePayPalOrder(data.orderID);
              if (!cancelled) {
                setMessage(
                  useAuthorize
                    ? 'אישור התשלום הושלם — החיוב יתבצע עם פרסום המודעה.'
                    : 'התשלום הושלם בהצלחה.',
                );
              }
              await onCaptureSuccessRef.current?.(result);
            } catch (e) {
              reportError(e);
            }
          },
          onError: (err) => reportError(err),
          onCancel: () => {
            if (!cancelled) setMessage('התשלום בוטל.');
          },
        };

        if (brandedPayPalOnly && paypal.FUNDING?.PAYPAL !== undefined) {
          buttonOptions.fundingSource = paypal.FUNDING.PAYPAL;
        }

        buttonsInstance = paypal.Buttons(buttonOptions);
        if (!buttonsInstance.isEligible()) {
          reportError(new Error('PayPal לא זמין בדפדפן הזה. נסו דפדפן אחר או כרטיס אשראי (PayMe).'));
          return;
        }
        await buttonsInstance.render(buttonsHostRef.current);
      } catch (e) {
        if (!cancelled) reportError(e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        buttonsInstance?.close?.();
      } catch {
        /* ignore */
      }
      if (buttonsHostRef.current) buttonsHostRef.current.innerHTML = '';
    };
  }, [clientId, currencyCode, reportError, locked, fixedAmount, brandedPayPalOnly, paymentIntent]);

  if (!clientId) {
    return (
      <div className="paypal-checkout paypal-checkout--missing">
        <p>
          <strong>חסר PayPal Client ID.</strong> הוסיפו <code>VITE_PAYPAL_CLIENT_ID</code> ל־<code>client/.env</code>{' '}
          והפעילו מחדש את Vite.
        </p>
      </div>
    );
  }

  return (
    <div className="paypal-checkout">
      {!locked && (
        <label className="paypal-checkout__label">
          סכום ({currencyCode})
          <input
            type="number"
            min="0.01"
            step="0.01"
            max="50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="paypal-checkout__input"
          />
        </label>
      )}

      <div className="paypal-checkout__buttons" ref={buttonsHostRef} />

      {message ? <p className="paypal-checkout__message">{message}</p> : null}
    </div>
  );
}
