import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './AuthPages.css';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/my-apartments';
  const forwardState = location.state?.plan ? { plan: location.state.plan } : undefined;
  const notice = location.state?.notice || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState(null);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResendError(null);
    setNeedsVerification(false);
    setResent(false);
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true, state: forwardState });
    } catch (err) {
      setError(err.message);
      if (err.needsVerification || /אומת|אימות/.test(err.message || '')) {
        setNeedsVerification(true);
        setVerificationEmail(err.email || form.email.trim());
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const email = verificationEmail || form.email.trim();
    if (!email) {
      setResendError('יש להזין אימייל לפני שליחה מחדש.');
      return;
    }

    setResendError(null);
    setResending(true);
    try {
      await resendVerification(email);
      setResent(true);
    } catch (err) {
      setResent(false);
      setResendError(err.message || 'שליחת המייל נכשלה. נסו שוב.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">התחברות</h1>
      <p className="auth-subtitle">היכנסו כדי לנהל את הדירות שלכם ולפרסם דירות חדשות</p>

      {needsVerification && (
        <div className="auth-notice auth-notice-verify">
          <p>עדיין לא אימתת את האימייל?</p>
          <button
            type="button"
            className="auth-resend-btn"
            onClick={handleResend}
            disabled={resending || resent}
          >
            {resending ? 'שולח...' : resent ? 'מייל אימות נשלח שוב' : 'שלחי מייל אימות שוב'}
          </button>
          {resendError && <p className="auth-resend-error">{resendError}</p>}
          {resent && !resendError && (
            <p className="auth-resend-success">בדקו את תיבת הדואר (וגם ספאם) עבור {verificationEmail || form.email.trim()}</p>
          )}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {notice && <div className="auth-notice">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label htmlFor="login-email">אימייל</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password">סיסמה</label>
          <input
            id="login-password"
            type="password"
            className="auth-input"
            value={form.password}
            onChange={update('password')}
            required
            autoComplete="current-password"
            dir="ltr"
          />
        </div>

        <div className="auth-forgot">
          <Link to="/forgot-password">שכחתי סיסמה</Link>
        </div>

        <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'מתחברת...' : 'כניסה'}
        </button>
      </form>

      <GoogleSignInButton
        onSuccess={() => navigate(redirectTo, { replace: true, state: forwardState })}
        onError={(msg) => setError(msg)}
      />

      <p className="auth-switch">
        אין לך חשבון עדיין? <Link to="/register">הירשמי כאן</Link>
      </p>
    </div>
  );
}

export default LoginPage;
