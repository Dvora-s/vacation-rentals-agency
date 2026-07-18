import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPaymentSession, getPaymentStatus, ilsToAgorot } from '../../services/paymentService.js';
import './PayMeHostedFields.css';

/**
 * PayMe iFrame checkout.
 *
 * Flow:
 * 1. POST /api/payments/create-session → server calls PayMe generate-sale
 *    and returns payme_sale_id + sale_url.
 * 2. Embed sale_url in an iframe (PayMe's official IFRAME integration —
 *    no external SDK script needed).
 * 3. Poll GET /api/payments/:id/status until IPN marks the payment as paid,
 *    then show a thank-you message and invoke onPaid.
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

  const [phase, setPhase] = useState(autoStart ? 'loading' : 'idle');
  const [error, setError] = useState('');
  const [saleUrl, setSaleUrl] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [thankYou, setThankYou] = useState(false);
  const startedRef = useRef(false);
  const activeRef = useRef(true);

  const reportError = useCallback(
    (msg) => {
      setError(String(msg));
      setPhase('error');
      onError?.(String(msg));
    },
    [onError],
  );

  /** Poll DB status (updated by PayMe IPN) until terminal state. */
  const pollUntilPaid = useCallback(
    async (id, saleId) => {
      // ~10 minutes: enough time to type card details in the iframe.
      for (let i = 0; i < 200; i++) {
        if (!activeRef.current) return;
        try {
          const st = await getPaymentStatus(id);
          if (!activeRef.current) return;
          if (st.status === 'paid') {
            setThankYou(true);
            setPhase('done');
            onPaid?.({ paymentId: id, paymeSaleId: saleId, status: st });
            return;
          }
          if (st.status === 'failed' || st.status === 'refunded') {
            reportError('תשלום PayMe לא הושלם או בוטל.');
            return;
          }
        } catch {
          /* transient network error — keep polling */
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    },
    [onPaid, reportError],
  );

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
      const url = session.saleUrl;
      const internalId = session.paymentId;
      if (!saleId) throw new Error('השרת לא החזיר payme_sale_id');
      if (!url) throw new Error('השרת לא החזיר sale_url מ-PayMe');

      setPaymentId(internalId);
      setSaleUrl(url);
      setPhase('ready');

      // Start watching for IPN confirmation while the buyer pays in the iframe.
      pollUntilPaid(internalId, saleId);
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
    pollUntilPaid,
    reportError,
  ]);

  useEffect(() => {
    activeRef.current = true;
    if (autoStart && !disabled) {
      startCheckout();
    }
    return () => {
      activeRef.current = false;
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

      {phase === 'loading' && (
        <p className="payme-hosted__muted" aria-live="polite">
          מכינים את טופס התשלום…
        </p>
      )}

      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}

      {phase === 'error' ? (
        <button
          type="button"
          className="btn-primary payme-hosted__start"
          onClick={() => {
            startedRef.current = false;
            startCheckout();
          }}
        >
          נסו שוב
        </button>
      ) : null}

      {/* PayMe iFrame mount point */}
      <div id={containerId} className="payme-hosted__iframe" aria-label="טופס תשלום PayMe">
        {phase === 'ready' && saleUrl ? (
          <iframe
            src={saleUrl}
            title="PayMe — תשלום מאובטח"
            className="payme-hosted__iframe-el"
            allow="payment"
          />
        ) : null}
      </div>
    </div>
  );
}
