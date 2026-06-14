import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPaymentStatus } from '../services/paymentService';
import './PaymentPages.css';

/**
 * Return URL after PayMe — polls server for latest DB status (optionally syncing from PayMe).
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const paymentId = params.get('paymentId');
  const [status, setStatus] = useState('טוען…');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const parsedId = useMemo(() => {
    const n = Number(paymentId);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [paymentId]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function tick() {
      if (!parsedId) {
        setError('חסר מזהה תשלום (paymentId) בכתובת.');
        setStatus('שגיאה');
        return;
      }
      attempts += 1;
      try {
        const data = await getPaymentStatus(parsedId, { sync: true });
        if (cancelled) return;
        setDetail(data);
        setStatus(String(data?.status || 'לא ידוע'));
        // Stop polling once terminal-ish states are reached.
        if (['paid', 'failed', 'refunded'].includes(String(data?.status))) return;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'שגיאה');
        setStatus('שגיאה');
        return;
      }
      if (attempts < 8) {
        window.setTimeout(tick, 1200);
      }
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [parsedId]);

  return (
    <section className="payme-page">
      <div className="payme-card">
        <h1>תשלום הושלם?</h1>
        <p className="payme-muted">
          אם חזרת מ־PayMe, המערכת בודקת את הסטטוס מול השרת. אישור סופי מגיע בדרך כלל דרך Webhook לשרת.
        </p>

        {error ? (
          <div className="payme-alert payme-alert-error" role="alert">
            {error}
          </div>
        ) : (
          <div className="payme-alert payme-alert-success" role="status">
            סטטוס נוכחי: <span className="payme-status-pill">{status}</span>
          </div>
        )}

        {detail ? (
          <div style={{ marginTop: '1rem' }}>
            <div className="payme-muted">
              מזהה פנימי: <span className="payme-mono">{String(detail.id)}</span>
            </div>
            <div className="payme-muted">
              מזהה PayMe:{' '}
              <span className="payme-mono">{detail.paymeTransactionId ? String(detail.paymeTransactionId) : '—'}</span>
            </div>
          </div>
        ) : null}

        <div className="payme-actions" style={{ marginTop: '1.25rem' }}>
          <Link className="payme-btn payme-btn-primary" to="/account">
            חזרה לאזור האישי
          </Link>
          <Link className="payme-btn payme-btn-ghost" to="/pay">
            תשלום נוסף
          </Link>
        </div>
      </div>
    </section>
  );
}
