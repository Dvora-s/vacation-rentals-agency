import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PayMeHostedFields from '../integrations/payme/PayMeHostedFields.jsx';
import './PaymentPages.css';

/**
 * PayMe checkout demo: iFrame / Hosted Fields (Option 2).
 */
export default function PaymentPage() {
  const { user, loading } = useAuth();
  const [amount, setAmount] = useState('100');
  const [currency, setCurrency] = useState('ILS');
  const [productName, setProductName] = useState('תשלום דוגמה');
  const [started, setStarted] = useState(false);

  const canPay = useMemo(() => Boolean(user) && !loading, [user, loading]);
  const totalIls = Number(amount);

  return (
    <section className="payme-page">
      <div className="payme-card">
        <h1>תשלום מאובטח (PayMe)</h1>
        <p className="payme-muted">
          זרימה: לחיצה על &quot;שלם&quot; יוצרת סשן בשרת (Generate Payment), ואז טופס PayMe מוטמע כאן
          באמצעות iFrame / Hosted Fields.
        </p>

        {!loading && !user ? (
          <p className="payme-muted">
            יש להתחבר כדי להמשיך. <Link to="/login">התחברות</Link>
          </p>
        ) : null}
        {loading ? <p className="payme-muted">טוען…</p> : null}

        {!started ? (
          <>
            <div className="payme-field">
              <label htmlFor="payme-amount">סכום (₪)</label>
              <input
                id="payme-amount"
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                disabled={!canPay}
              />
            </div>

            <div className="payme-field">
              <label htmlFor="payme-product">שם מוצר</label>
              <input
                id="payme-product"
                value={productName}
                onChange={(ev) => setProductName(ev.target.value)}
                disabled={!canPay}
              />
            </div>

            <div className="payme-field">
              <label htmlFor="payme-currency">מטבע</label>
              <select
                id="payme-currency"
                value={currency}
                onChange={(ev) => setCurrency(ev.target.value)}
                disabled={!canPay}
              >
                <option value="ILS">ILS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="payme-actions">
              <button
                className="payme-btn payme-btn-primary"
                type="button"
                disabled={!canPay || !Number.isFinite(totalIls) || totalIls <= 0}
                onClick={() => setStarted(true)}
              >
                שלם
              </button>
              <Link className="payme-btn payme-btn-ghost" to="/account">
                ביטול
              </Link>
            </div>
          </>
        ) : (
          <PayMeHostedFields
            key={`${amount}-${currency}-${productName}`}
            totalIls={totalIls}
            currencyCode={currency}
            productName={productName}
            returnUrl={`${window.location.origin}/pay/success?provider=payme`}
            cancelUrl={`${window.location.origin}/pay/failed?provider=payme`}
            autoStart
            onPaid={() => {}}
          />
        )}
      </div>
    </section>
  );
}
