import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApartmentForm from '../components/ApartmentForm';
import { createApartment, getListingFee, payForListing } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ListApartmentPage.css';

function ListApartmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('details'); // details → payment → done
  const [createdApt, setCreatedApt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fee, setFee] = useState({ amount_per_month: 30, currency: 'ILS' });
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    getListingFee()
      .then(setFee)
      .catch(() => {});
  }, []);

  async function handleCreate(payload) {
    setError(null);
    setSubmitting(true);
    try {
      const apt = await createApartment({
        ...payload,
        owner_name: payload.owner_name || user?.full_name || null,
        owner_email: payload.owner_email || user?.email || null,
        owner_phone: payload.owner_phone || user?.phone || null,
      });
      setCreatedApt(apt);
      setStep('payment');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    setError(null);
    setSubmitting(true);
    try {
      await payForListing({
        apartment_id: createdApt.id,
        months,
        provider_reference: paymentRef || null,
      });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="list-apt-page section-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>הדירה נשלחה לאישור</h1>
          <p>
            התשלום התקבל והפרסום ימתין לאישור המנהל. ברגע שהדירה תאושר היא תופיע בעמוד "חיפוש דירה".
          </p>
          <div className="success-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/my-apartments')}
            >
              לדירות שלי
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    const total = fee.amount_per_month * months;
    return (
      <div className="list-apt-page section-container">
        <h1 className="page-title">תשלום על פרסום הדירה</h1>
        <p className="page-subtitle">
          הדירה <strong>"{createdApt?.title}"</strong> נשמרה. כדי להעביר אותה לאישור המנהל יש להשלים תשלום.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div className="payment-card">
          <h3>פירוט החיוב</h3>
          <div className="payment-row">
            <span>עלות פרסום לחודש</span>
            <strong>₪{fee.amount_per_month}</strong>
          </div>

          <div className="payment-row">
            <label htmlFor="months">מספר חודשים</label>
            <input
              id="months"
              type="number"
              min="1"
              max="24"
              className="auth-input"
              value={months}
              onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: '90px' }}
            />
          </div>

          <div className="payment-row payment-total">
            <span>סך הכל לתשלום</span>
            <strong>₪{total}</strong>
          </div>

          <div className="payment-row payment-ref">
            <label htmlFor="ref">אסמכתא / מספר עסקה (אופציונלי)</label>
            <input
              id="ref"
              className="auth-input"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="יוזן אוטומטית כשמתחברים לסליקה"
              dir="ltr"
            />
          </div>

          <p className="payment-note">
            ⓘ זוהי תצורת פיתוח — אין כאן סליקה אמיתית. בלחיצה התשלום יסומן כשולם וניתן יהיה לחבר ספק סליקה אמיתי בהמשך.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={handlePay}
            disabled={submitting}
          >
            {submitting ? 'מבצע תשלום...' : `אישור תשלום של ₪${total}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">פרסום דירה חדשה</h1>
      <p className="page-subtitle">
        מלאי את פרטי הדירה. בשלב הבא תועברי לתשלום ₪{fee.amount_per_month} לחודש, ולאחר מכן המנהל יאשר את הפרסום.
      </p>

      <ApartmentForm
        onSubmit={handleCreate}
        submitting={submitting}
        error={error}
        submitLabel="המשך לתשלום"
      />
    </div>
  );
}

export default ListApartmentPage;
