import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  bindPayMeFieldsEvents,
  createPayMeFieldsInstance,
  loadPayMeFieldsScript,
} from './paymeFieldsLoader.js';
import { createPaymentSession, getPaymentStatus, ilsToAgorot } from '../../services/paymentService.js';
import './PayMeHostedFields.css';

/**
 * PayMe iFrame / Hosted Fields checkout (Option 2).
 *
 * Flow:
 * 1. Fetch payme_sale_id from POST /api/payments/create-session
 * 2. Initialize PayMeFields with sale ID + #payme-iframe-container
 * 3. On success → poll DB status (IPN) and invoke onPaid
 */
export default function PayMeHostedFields({
  /** Price in ILS (major units) — converted to agorot for the API */
  totalIls,
  currencyCode = 'ILS',
  productName,
  metadata,
  returnUrl,
  cancelUrl,
  onPaid,
  onError,
  disabled = false,
  autoStart = true,
}) {
  const reactId = useId();
  const containerId = `payme-iframe-container-${reactId.replace(/:/g, '')}`;
  const containerSelector = `#${containerId}`;

  const [phase, setPhase] = useState(autoStart ? 'loading' : 'idle');
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [thankYou, setThankYou] = useState(false);
  const instanceRef = useRef(null);
  const startedRef = useRef(false);

  const reportError = useCallback(
    (msg) => {
      setError(String(msg));
      setPhase('error');
      onError?.(String(msg));
    },
    [onError],
  );

  const waitForPaid = useCallback(async (id) => {
    for (let i = 0; i < 25; i++) {
      const st = await getPaymentStatus(id);
      if (st.status === 'paid') return st;
      if (st.status === 'failed' || st.status === 'refunded') {
        throw new Error('תשלום PayMe לא הושלם');
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    throw new Error('ממתינים לאישור התשלום — נסו לרענן בעוד דקה');
  }, []);

  const startCheckout = useCallback(async () => {
    if (disabled || startedRef.current) return;
    startedRef.current = true;
    setPhase('loading');
    setError('');
    setThankYou(false);

    try {
      const priceAgorot = ilsToAgorot(totalIls);
      if (!Number.isFinite(priceAgorot) || priceAgorot <= 0) {
        throw new Error('סכום לא תקין');
      }

      const session = await createPaymentSession({
        price: priceAgorot,
        currency: currencyCode,
        product_name: productName,
        metadata,
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });

      const saleId = session.payme_sale_id || session.paymeSaleId;
      const internalId = session.paymentId;
      if (!saleId) throw new Error('השרת לא החזיר payme_sale_id');
      setPaymentId(internalId);

      await loadPayMeFieldsScript();

      const container = document.getElementById(containerId);
      if (!container) throw new Error('מיכל התשלום לא נמצא');

      container.innerHTML = '';

      const instance = createPayMeFieldsInstance(saleId, containerSelector);
      instanceRef.current = instance;

      bindPayMeFieldsEvents(instance, {
        onSuccess: async () => {
          setPhase('confirming');
          try {
            const st = await waitForPaid(internalId);
            setThankYou(true);
            setPhase('done');
            onPaid?.({ paymentId: internalId, paymeSaleId: saleId, status: st });
          } catch (e) {
            reportError(e instanceof Error ? e.message : String(e));
          }
        },
        onError: (err) => {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String(err.message)
              : 'שגיאה בתשלום PayMe';
          reportError(msg);
        },
      });

      setPhase('ready');
    } catch (e) {
      startedRef.current = false;
      reportError(e instanceof Error ? e.message : String(e));
    }
  }, [
    disabled,
    totalIls,
    currencyCode,
    productName,
    metadata,
    returnUrl,
    cancelUrl,
    containerId,
    containerSelector,
    onPaid,
    reportError,
    waitForPaid,
  ]);

  useEffect(() => {
    if (autoStart && !disabled) {
      startCheckout();
    }
    return () => {
      instanceRef.current = null;
    };
  }, [autoStart, disabled, startCheckout]);

  const totalStr = Number(totalIls).toFixed(2);

  if (thankYou) {
    return (
      <div className="payme-hosted payme-hosted--success" dir="rtl">
        <div className="payme-hosted__thankyou" role="status">
          <h3>תודה! התשלום התקבל בהצלחה</h3>
          {paymentId ? (
            <p className="payme-hosted__muted">
              מזהה תשלום: <span className="payme-mono">{paymentId}</span>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="payme-hosted" dir="rtl">
      <p className="payme-hosted__intro">
        סכום לתשלום: <strong>₪{totalStr}</strong> ({currencyCode})
      </p>

      {phase === 'idle' && (
        <button type="button" className="btn-primary payme-hosted__start" onClick={startCheckout} disabled={disabled}>
          טעינת טופס תשלום מאובטח
        </button>
      )}

      {(phase === 'loading' || phase === 'confirming') && (
        <p className="payme-hosted__muted" aria-live="polite">
          {phase === 'confirming' ? 'מאשרים את התשלום…' : 'מכינים את טופס התשלום…'}
        </p>
      )}

      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}

      {phase === 'error' && !autoStart ? (
        <button type="button" className="btn-primary payme-hosted__start" onClick={() => { startedRef.current = false; startCheckout(); }}>
          נסו שוב
        </button>
      ) : null}

      {/* PayMe iFrame / Hosted Fields mount point (required by PayMe SDK) */}
      <div id={containerId} className="payme-hosted__iframe" aria-label="טופס תשלום PayMe" />
    </div>
  );
}
