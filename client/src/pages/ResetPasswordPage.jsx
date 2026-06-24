import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { PASSWORD_RULE, PASSWORD_HINT } from '../utils/passwordPolicy';
import './AuthPages.css';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    if (!PASSWORD_RULE.test(form.password)) {
      setError(`סיסמה חלשה. ${PASSWORD_HINT}.`);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, form.password);
      navigate('/login', {
        replace: true,
        state: { notice: 'הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.' },
      });
    } catch (err) {
      setError(err.message || 'איפוס הסיסמה נכשל.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-wrap auth-verify-card">
        <span className="auth-verify-icon" aria-hidden="true">⚠️</span>
        <h1 className="auth-title">קישור לא תקין</h1>
        <p className="auth-subtitle">קישור איפוס הסיסמה חסר או אינו תקין.</p>
        <Link to="/forgot-password" className="btn-primary auth-submit">
          לבקשת קישור חדש
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">בחירת סיסמה חדשה</h1>
      <p className="auth-subtitle">בחרו סיסמה חדשה ובטוחה לחשבון שלכם.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label htmlFor="reset-password">סיסמה חדשה</label>
          <input
            id="reset-password"
            type="password"
            className="auth-input"
            value={form.password}
            onChange={update('password')}
            required
            autoComplete="new-password"
            dir="ltr"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-confirm">אימות סיסמה</label>
          <input
            id="reset-confirm"
            type="password"
            className="auth-input"
            value={form.confirm}
            onChange={update('confirm')}
            required
            autoComplete="new-password"
            dir="ltr"
          />
        </div>

        <p className="auth-hint">{PASSWORD_HINT}.</p>

        <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'מעדכנת...' : 'עדכון סיסמה'}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login">חזרה להתחברות</Link>
      </p>
    </div>
  );
}

export default ResetPasswordPage;
