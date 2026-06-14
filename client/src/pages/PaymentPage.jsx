import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPayment } from '../services/paymentService';
import './PaymentPages.css';

/**
 * PayMe checkout entry: creates a server-side payment row + PayMe session, then redirects the browser.
 */
export default function PaymentPage() {
  const { user, loading } = useAuth();
  const [amount, setAmount] = useState('10');
  const [currency, setCurrency] = useState('ILS');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canPay = useMemo(() => Boolean(user) && !loading, [user, loading]);

  async function onPay() {
    setError('');
    setBusy(true);
    try {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error('סכום לא תקין');
      }
      const data = await createPayment({
        amount: n,
        currency,
        description: 'תשלום דוגמה (PayMe)',
        // Optional: override return/cancel URLs (must be absolute http(s) URLs).
        // return_url: `${window.location.origin}/pay/success?provider=payme`,
        // cancel_url: `${window.location.origin}/pay/failed?provider=payme`,
      });
      const url = data?.checkoutUrl;
      if (!url) {
        throw new Error('השרת לא החזיר כתובת תשלום (checkoutUrl)');
      }
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא צפויה');
      setBusy(false);
    }
  }

  return (
    <section className="payme-page">
      <div className="payme-card">
        <h1>תשלום מאובטח (PayMe)</h1>
        <p className="payme-muted">
          זרימה: לחיצה על &quot;שלם&quot; יוצרת תשלום בשרת, נרשמת שורה ב־MySQL, ואז מועברים לדף התשלום של PayMe.
        </p>

        {!loading && !user ? (
          <p className="payme-muted">
            יש להתחבר כדי להמשיך. <Link to="/login">התחברות</Link>
          </p>
        ) : null}
        {loading ? <p className="payme-muted">טוען…</p> : null}

        <div className="payme-field">
          <label htmlFor="payme-amount">סכום</label>
          <input
            id="payme-amount"
            inputMode="decimal"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            disabled={!canPay || busy}
          />
        </div>

        <div className="payme-field">
          <label htmlFor="payme-currency">מטבע</label>
          <select
            id="payme-currency"
            value={currency}
            onChange={(ev) => setCurrency(ev.target.value)}
            disabled={!canPay || busy}
          >
            <option value="ILS">ILS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {error ? (
          <div className="payme-alert payme-alert-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="payme-actions">
          <button className="payme-btn payme-btn-primary" type="button" disabled={!canPay || busy} onClick={onPay}>
            {busy ? 'מכין תשלום…' : 'שלם'}
          </button>
          <Link className="payme-btn payme-btn-ghost" to="/account">
            ביטול
          </Link>
        </div>
      </div>
    </section>
  );
}
