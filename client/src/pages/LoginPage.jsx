import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/my-apartments';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">התחברות</h1>
      <p className="auth-subtitle">היכנסי כדי לנהל את הדירות שלך ולפרסם דירות חדשות</p>

      <form className="auth-form" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          className="btn-primary auth-submit"
          disabled={submitting}
        >
          {submitting ? 'מתחברת...' : 'כניסה'}
        </button>
      </form>

      <p className="auth-switch">
        אין לך חשבון עדיין? <Link to="/register">הירשמי כאן</Link>
      </p>
    </div>
  );
}

export default LoginPage;
