import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaymentStatus } from '../services/paymentService';
import { payForListing } from '../services/api';

const STORAGE_KEY = 'payme_listing_pending';

/**
 * אחרי חזרה מ־PayMe, השרת מוסיף ל־URL את `paymentId` (מזהה שורה ב־`payments`).
 * בודקים עד `paid`, ואז מפעילים `payForListing` (כמו PayPal).
 */
export function usePayMeListingReturn({ validatePending, onPaid, onError }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');

  const validateRef = useRef(validatePending);
  const onPaidRef = useRef(onPaid);
  const onErrorRef = useRef(onError);
  validateRef.current = validatePending;
  onPaidRef.current = onPaid;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!paymentId) return;

    let raw;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pending || typeof pending !== 'object') return;
    if (!validateRef.current(pending)) return;

    const doneKey = `payme_listing_done_${paymentId}`;
    try {
      if (sessionStorage.getItem(doneKey)) return;
    } catch {
      return;
    }

    const lockKey = `payme_listing_lock_${paymentId}`;
    try {
      if (sessionStorage.getItem(lockKey)) return;
      sessionStorage.setItem(lockKey, '1');
    } catch {
      return;
    }

    let active = true;

    async function run() {
      try {
        for (let i = 0; i < 30; i++) {
          if (!active) return;
          const st = await getPaymentStatus(paymentId, { sync: true });
          if (!active) return;
          if (st.status === 'paid') {
            await payForListing({
              apartment_id: pending.apartmentId,
              months: pending.months,
              tier: pending.tier,
              provider: 'payme',
              provider_reference: st.paymeTransactionId || `payme:${paymentId}`,
            });
            if (!active) return;
            try {
              sessionStorage.removeItem(STORAGE_KEY);
              sessionStorage.setItem(doneKey, '1');
            } catch {
              /* ignore */
            }
            navigate(window.location.pathname, { replace: true });
            onPaidRef.current(pending);
            return;
          }
          if (st.status === 'failed' || st.status === 'refunded') {
            onErrorRef.current?.('תשלום PayMe לא הושלם או בוטל.');
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
            navigate(window.location.pathname, { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 1100));
        }
        onErrorRef.current?.('עדיין ממתינים לאישור התשלום מ־PayMe. נסו לרענן בעוד דקה.');
      } catch (e) {
        if (active) {
          onErrorRef.current?.(e instanceof Error ? e.message : String(e));
        }
      } finally {
        try {
          sessionStorage.removeItem(lockKey);
        } catch {
          /* ignore */
        }
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [paymentId, navigate]);
}

export { STORAGE_KEY as PAYME_LISTING_STORAGE_KEY };
