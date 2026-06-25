import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMyApartments,
  deleteApartment,
  getMyPayments,
  getMyContactMessages,
} from '../services/api';
import RejectedListingActions from '../components/RejectedListingActions';
import ResubmitApartmentButton from '../components/ResubmitApartmentButton';
import { getApartmentCoverUrl } from '../utils/mediaUrl';
import './MyApartmentsPage.css';
import './AccountPage.css';

const STATUS_LABEL = {
  pending: 'ממתינה לאישור מנהל (שולם)',
  awaiting_payment: 'ממתינה לתשלום',
  approved: 'מאושרת ומפורסמת',
  rejected: 'נדחתה',
  expired: 'פג תוקף — הושעתה',
};

const PAYMENT_STATUS = {
  paid: { label: 'שולם', cls: 'ok' },
  authorized: { label: 'אושר — ממתין לפרסום', cls: 'warn' },
  pending: { label: 'ממתין לתשלום', cls: 'warn' },
  failed: { label: 'נכשל', cls: 'bad' },
  refunded: { label: 'זוכה', cls: 'muted' },
};

const ils = (n) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

function formatDate(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return String(value).slice(0, 10);
  }
}

function monthsLabel(months) {
  const n = Number(months) || 1;
  return n === 1 ? 'חודש אחד' : `${n} חודשים`;
}

const TABS = [
  { id: 'apartments', label: 'הדירות שלי' },
  { id: 'receipts', label: 'קבלות ותשלומים' },
  { id: 'questions', label: 'השאלות שלי' },
];

// ───────── טאב: הדירות שלי ─────────
function ApartmentsTab() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApartments(await getMyApartments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    if (!confirm('למחוק את הדירה? פעולה זו אינה הפיכה.')) return;
    try {
      await deleteApartment(id);
      setApartments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p className="loading-text">טוען...</p>;
  if (error) return <div className="auth-error">{error}</div>;

  if (apartments.length === 0) {
    return (
      <div className="empty-state">
        <p>עדיין אין לך דירות.</p>
        <Link to="/list-apartment" className="btn-primary">
          פרסמו את הדירה הראשונה שלכם
        </Link>
      </div>
    );
  }

  return (
    <div className="my-apt-list">
      {apartments.map((apt) => (
        <article key={apt.id} className={`my-apt-card status-${apt.status}`}>
          <div className="my-apt-thumb">
            {getApartmentCoverUrl(apt) && (
              <img src={getApartmentCoverUrl(apt)} alt={apt.title} />
            )}
          </div>
          <div className="my-apt-body">
            <div className="my-apt-header">
              <h3>{apt.title}</h3>
              <span className={`status-pill status-${apt.status}`}>
                {STATUS_LABEL[apt.status] || apt.status}
              </span>
            </div>
            <p className="my-apt-meta">
              {apt.location} · {apt.bedrooms} חדרי שינה · עד {apt.max_guests} נפשות · ₪
              {apt.price_per_night}
            </p>
            {apt.status === 'rejected' && (
              <RejectedListingActions
                apartment={apt}
                showEditLink={false}
                showResubmitButton={false}
                className="my-apt-rejected-block"
              />
            )}
            {apt.status === 'expired' && (
              <p className="my-apt-reject">
                תוקף הפרסום פג והמודעה הושעתה. השלימו תשלום לחידוש — המודעה תישלח לאישור המנהל ותעלה לאתר
                רק לאחר האישור.
              </p>
            )}
            <div className="my-apt-actions">
              {apt.status === 'awaiting_payment' && (
                <Link to={`/list-apartment?resume=${apt.id}`} className="btn-primary">
                  המשך לתשלום
                </Link>
              )}
              {apt.status === 'expired' && (
                <Link to={`/list-apartment?resume=${apt.id}`} className="btn-primary">
                  תשלום ושליחה לאישור
                </Link>
              )}
              {apt.status === 'rejected' && (
                <ResubmitApartmentButton
                  apartment={apt}
                  className="btn-primary"
                  onResubmitted={(updated) =>
                    setApartments((prev) =>
                      prev.map((a) => (a.id === apt.id ? { ...a, ...updated } : a)),
                    )
                  }
                />
              )}
              <Link to={`/my-apartments/${apt.id}/edit`} className="btn-outline-gold">
                ערוך
              </Link>
              <Link to={`/apartments/${apt.id}`} className="my-apt-link">
                צפייה
              </Link>
              <button type="button" className="my-apt-delete" onClick={() => handleDelete(apt.id)}>
                מחק
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ───────── טאב: קבלות ותשלומים ─────────
function ReceiptsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getMyPayments();
        if (active) setPayments(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="loading-text">טוען...</p>;
  if (error) return <div className="auth-error">{error}</div>;

  if (payments.length === 0) {
    return (
      <div className="empty-state">
        <p>עדיין אין קבלות. כשתפרסם דירה בתשלום, הקבלה תופיע כאן.</p>
        <Link to="/list-apartment" className="btn-primary">
          פרסם דירה
        </Link>
      </div>
    );
  }

  return (
    <div className="account-receipts">
      {payments.map((p) => {
        const status = PAYMENT_STATUS[p.status] || { label: p.status, cls: 'muted' };
        return (
          <article key={p.id} className="receipt-card">
            <div className="receipt-head">
              <div>
                <span className="receipt-label">קבלה</span>
                <span className="receipt-number">#{10000 + p.id}</span>
              </div>
              <span className={`receipt-status receipt-status--${status.cls}`}>{status.label}</span>
            </div>

            <h3 className="receipt-title">{p.apartment_title || 'מנוי פרסום מודעה'}</h3>

            <dl className="receipt-rows">
              <div>
                <dt>סכום</dt>
                <dd className="receipt-amount">{ils(p.amount)}</dd>
              </div>
              <div>
                <dt>תקופת פרסום</dt>
                <dd>{monthsLabel(p.months)}</dd>
              </div>
              <div>
                <dt>תאריך תשלום</dt>
                <dd>{formatDate(p.paid_at || p.created_at)}</dd>
              </div>
              {p.period_start && p.period_end && (
                <div>
                  <dt>תוקף</dt>
                  <dd>
                    {formatDate(p.period_start)} – {formatDate(p.period_end)}
                  </dd>
                </div>
              )}
              {p.provider_reference && (
                <div>
                  <dt>אסמכתא</dt>
                  <dd dir="ltr">{p.provider_reference}</dd>
                </div>
              )}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

// ───────── טאב: השאלות שלי ─────────
function QuestionsTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getMyContactMessages();
        if (active) setMessages(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="loading-text">טוען...</p>;
  if (error) return <div className="auth-error">{error}</div>;

  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <p>עדיין לא שלחת שאלות למערכת.</p>
        <Link to="/contact" className="btn-primary">
          שליחת פנייה חדשה
        </Link>
      </div>
    );
  }

  return (
    <div className="account-questions">
      {messages.map((m) => (
        <article key={m.id} className="question-card">
          <header className="question-head">
            <span className="question-date">{formatDate(m.created_at)}</span>
          </header>
          <p className="question-text">{m.message}</p>
        </article>
      ))}
    </div>
  );
}

// ───────── דף ראשי: אזור אישי ─────────
function AccountPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('apartments');

  return (
    <div className="account-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">אזור אישי</h1>
          <p className="page-subtitle">
            שלום {user?.full_name} — כאן מרוכזים הדירות, הקבלות והשאלות שלכם
          </p>
        </div>
        <Link to="/list-apartment" className="btn-primary">
          + פרסם דירה חדשה
        </Link>
      </div>

      <div className="account-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`account-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="account-tab-panel">
        {activeTab === 'apartments' && <ApartmentsTab />}
        {activeTab === 'receipts' && <ReceiptsTab />}
        {activeTab === 'questions' && <QuestionsTab />}
      </div>
    </div>
  );
}

export default AccountPage;