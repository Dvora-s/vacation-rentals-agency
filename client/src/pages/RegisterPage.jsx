import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/api';
import EmailVerificationPrompt from '../components/EmailVerificationPrompt';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './AuthPages.css';

import { PASSWORD_RULE, PASSWORD_HINT } from '../utils/passwordPolicy';

const PENDING_VERIFICATION_KEY = 'nofesh.pendingVerification';

function readStoredVerification() {
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFICATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeVerification(data) {
  try {
    sessionStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clearStoredVerification() {
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_KEY);
  } catch {
    /* ignore */
  }
}

function verificationFromResult(result, fallbackEmail) {
  if (!result?.pending_verification && !result?.email && !result?.verify_url) return null;
  const mailQueued = result.mail_queued === true;
  return {
    email: result.email || fallbackEmail,
    message: result.message,
    mailSent: mailQueued ? true : result.mail_sent,
    mailQueued,
    mailerConfigured: result.mailer_configured,
    verifyUrl: result.verify_url,
  };
}

function verificationFromError(err, fallbackEmail) {
  if (!err?.pendingVerification && !err?.verifyUrl && !err?.needsVerification) return null;
  return {
    email: err.email || fallbackEmail,
    message: err.serverMessage || err.message,
    mailSent: err.mailSent,
    verifyUrl: err.verifyUrl,
  };
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState(() => readStoredVerification());
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState(null);

  useEffect(() => {
    const stored = readStoredVerification();
    if (stored) setVerification(stored);
  }, []);

  function showVerification(next) {
    setVerification(next);
    storeVerification(next);
    setError(null);
  }

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (!PASSWORD_RULE.test(form.password)) {
      setError(`סיסמה חלשה. ${PASSWORD_HINT}.`);
      return;
    }

    setSubmitting(true);
    const email = form.email.trim();
    try {
      const result = await register({
        full_name: form.full_name.trim(),
        email,
        phone: form.phone.trim() || null,
        password: form.password,
      });
      const next = verificationFromResult(result, email);
      if (next) {
        showVerification(next);
      } else {
        setError('ההרשמה הצליחה אך לא התקבלו פרטי אימות. נסו להתחבר.');
      }
    } catch (err) {
      const pending = verificationFromError(err, email);
      if (pending) {
        showVerification(pending);
      } else if (err.alreadyRegistered) {
        setError('חשבון עם האימייל הזה כבר קיים. אפשר להתחבר מהקישור למטה.');
      } else {
        setError(err.message || 'ההרשמה נכשלה. נסו שוב.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!verification?.email) return;
    setResendError(null);
    setResending(true);
    try {
      const result = await resendVerification(verification.email);
      setResent(true);
      const mailQueued = result?.mail_queued === true;
      const next = {
        ...verification,
        mailSent: mailQueued ? true : result?.mail_sent,
        mailQueued,
        verifyUrl: result?.verify_url || verification.verifyUrl,
        message: result?.message || verification.message,
      };
      showVerification(next);
    } catch (err) {
      setResent(false);
      setResendError(err.message || 'שליחת המייל נכשלה. נסו שוב.');
    } finally {
      setResending(false);
    }
  }

  if (verification) {
    return (
      <div className="auth-wrap auth-verify-card">
        <span className="auth-verify-icon" aria-hidden="true">📩</span>
        <h1 className="auth-title">כמעט סיימנו!</h1>
        <EmailVerificationPrompt
          email={verification.email}
          message={verification.message || 'יש לאמת את האימייל כדי להפעיל את החשבון.'}
          mailSent={verification.mailSent}
          verifyUrl={verification.verifyUrl}
          onResend={handleResend}
          resending={resending}
          resent={resent}
          resendError={resendError}
        />
        <p className="auth-switch">
          <button type="button" className="auth-resend" onClick={() => { clearStoredVerification(); setVerification(null); }}>
            חזרה לטופס הרשמה
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">הרשמה</h1>
      <p className="auth-subtitle">
        פתחו חשבון כדי לפרסם דירות. דרישת סיסמה: {PASSWORD_HINT}.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label htmlFor="reg-name">שם מלא</label>
          <input
            id="reg-name"
            type="text"
            className="auth-input"
            value={form.full_name}
            onChange={update('full_name')}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reg-email">אימייל</label>
          <input
            id="reg-email"
            type="email"
            className="auth-input"
            value={form.email}
            onChange={update('email')}
            required
            autoComplete="email"
            dir="ltr"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reg-phone">טלפון (אופציונלי)</label>
          <input
            id="reg-phone"
            type="tel"
            className="auth-input"
            value={form.phone}
            onChange={update('phone')}
            autoComplete="tel"
            dir="ltr"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reg-password">סיסמה</label>
          <input
            id="reg-password"
            type="password"
            className="auth-input"
            value={form.password}
            onChange={update('password')}
            required
            autoComplete="new-password"
            dir="ltr"
          />
          <span className="auth-hint">לפחות 8 תווים, אות גדולה וקטנה, ספרה ותו מיוחד</span>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-confirm">אימות סיסמה</label>
          <input
            id="reg-confirm"
            type="password"
            className="auth-input"
            value={form.confirm}
            onChange={update('confirm')}
            required
            autoComplete="new-password"
            dir="ltr"
          />
        </div>

        <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'נרשמים...' : 'הרשמה'}
        </button>
      </form>

      <GoogleSignInButton
        onSuccess={() => navigate('/my-apartments', { replace: true })}
        onError={(msg) => setError(msg)}
      />

      <p className="auth-switch">
        כבר יש לכם חשבון? <Link to="/login">היכנסו כאן</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
