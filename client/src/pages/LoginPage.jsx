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
  // שמירת המסלול שנבחר במחירון כדי להעבירו הלאה לעמוד הפרסום לאחר ההתחברות.
  const forwardState = location.state?.plan ? { plan: location.state.plan } : undefined;
  // הודעת מערכת (למשל לאחר איפוס סיסמה מוצלח).
  const notice = location.state?.notice || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true, state: forwardState });
    } catch (err) {
      setError(err.message);
      // השרת מסמן צורך באימות עם הטקסט; מזהים זאת לפי המילה "אומת"
      if (err.needsVerification || /אומת|אימות/.test(err.message || '')) {
        setNeedsVerification(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await resendVerification(form.email.trim());
    } catch {
      /* ignore */
    } finally {
      setResent(true);
    }
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">התחברות</h1>
      <p className="auth-subtitle">היכנסו כדי לנהל את הדירות שלכם ולפרסם דירות חדשות</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {notice && <div className="auth-notice">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}

        {needsVerification && (
          <div className="auth-notice">
            עדיין לא אימתת את האימייל?{' '}
            <button type="button" className="auth-resend" onClick={handleResend} disabled={resent}>
              {resent ? 'מייל אימות נשלח שוב' : 'שלחי מייל אימות שוב'}
            </button>
          </div>
        )}

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
