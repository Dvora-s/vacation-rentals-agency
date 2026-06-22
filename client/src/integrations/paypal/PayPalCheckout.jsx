import { useCallback, useEffect, useRef, useState } from 'react';
import { capturePayPalOrder, createPayPalOrder } from '../../services/api.js';
import './PayPalCheckout.css';

const clientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim();
const payPalMode = String(import.meta.env.VITE_PAYPAL_MODE ?? 'sandbox').trim().toLowerCase();
const payPalSdkHost =
  payPalMode === 'live' || payPalMode === 'production'
    ? 'https://www.paypal.com'
    : 'https://www.sandbox.paypal.com';

/** Load official PayPal JS SDK from CDN (no extra npm package — avoids registry TLS issues). */
function loadPayPalScript(cid, currency) {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.paypal) {
      resolve(window.paypal);
      return;
    }
    const existing = document.querySelector('script[data-nofesh-paypal-sdk]');
    if (existing) {
      const done = () => {
        if (window.paypal) resolve(window.paypal);
        else reject(new Error('PayPal SDK loaded but window.paypal is missing'));
      };
      if (window.paypal) {
        done();
        return;
      }
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('PayPal script failed')));
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-nofesh-paypal-sdk', '1');
    script.async = true;
    const params = new URLSearchParams({
      'client-id': cid,
      currency,
      intent: 'capture',
      locale: 'he_IL',
      'buyer-country': 'IL',
      components: 'buttons',
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
 * PayPal Smart Buttons: create order → your backend → capture → your backend.
 * @param {string} [fixedAmount] — if set, amount is locked (e.g. listing total) and the input is hidden.
 * @param {boolean} [brandedPayPalOnly] — if true, show only the yellow PayPal wallet button (official look).
 */
export default function PayPalCheckout({
  currencyCode = 'USD',
  defaultAmount = '10.00',
  fixedAmount = null,
  brandedPayPalOnly = false,
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

  const handleError = useCallback(
    (err) => {
      const text = err?.message || String(err);
      setMessage(text);
      onError?.(err);
    },
    [onError],
  );

  useEffect(() => {
    if (!clientId || !buttonsHostRef.current) return undefined;

    let cancelled = false;
    let buttonsInstance = null;

    (async () => {
      try {
        const paypal = await loadPayPalScript(clientId, currencyCode);
        if (cancelled || !buttonsHostRef.current) return;

        buttonsHostRef.current.innerHTML = '';

        const buttonOptions = {
          style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            setMessage('');
            const value = Number.parseFloat(amountRef.current);
            if (!Number.isFinite(value) || value <= 0) {
              const err = new Error('סכום לא תקין');
              handleError(err);
              throw err;
            }
            const data = await createPayPalOrder({
              currency_code: currencyCode,
              value: value.toFixed(2),
            });
            if (!data?.id && !data?.orderID) {
              const err = new Error('השרת לא החזיר מזהה הזמנה מ־PayPal');
              handleError(err);
              throw err;
            }
            return data.id || data.orderID;
          },
          onApprove: async (data) => {
            try {
              const result = await capturePayPalOrder(data.orderID);
              setMessage('התשלום הושלם בהצלחה.');
              onCaptureSuccess?.(result);
            } catch (e) {
              handleError(e);
            }
          },
          onError: (err) => handleError(err),
        };

        if (brandedPayPalOnly && paypal.FUNDING?.PAYPAL !== undefined) {
          buttonOptions.fundingSource = paypal.FUNDING.PAYPAL;
        }

        buttonsInstance = paypal.Buttons(buttonOptions);
        await buttonsInstance.render(buttonsHostRef.current);
      } catch (e) {
        if (!cancelled) handleError(e);
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
  }, [clientId, currencyCode, handleError, onCaptureSuccess, locked, fixedAmount, brandedPayPalOnly]);

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
