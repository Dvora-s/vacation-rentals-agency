import { Link, useSearchParams } from 'react-router-dom';
import './PaymentPages.css';

/**
 * Cancel / failure return URL — PayMe may redirect here on cancel; also usable for local errors.
 */
export default function PaymentFailed() {
  const [params] = useSearchParams();
  const paymentId = params.get('paymentId');
  const reason = params.get('reason');

  return (
    <section className="payme-page">
      <div className="payme-card">
        <h1>התשלום לא הושלם</h1>
        <p className="payme-muted">
          אם ביטלת בכוונה — אין בעיה. אם משהו נכשל, נסו שוב או צרו קשר עם התמיכה.
        </p>

        <div className="payme-alert payme-alert-error" role="status">
          {reason ? <div>{reason}</div> : <div>התשלום לא אושר או בוטל.</div>}
          {paymentId ? (
            <div className="payme-muted" style={{ marginTop: '0.5rem' }}>
              מזהה תשלום פנימי: <span className="payme-mono">{paymentId}</span>
            </div>
          ) : null}
        </div>

        <div className="payme-actions" style={{ marginTop: '1.25rem' }}>
          <Link className="payme-btn payme-btn-primary" to="/pay">
            ניסיון חוזר
          </Link>
          <Link className="payme-btn payme-btn-ghost" to="/contact">
            צור קשר
          </Link>
        </div>
      </div>
    </section>
  );
}
