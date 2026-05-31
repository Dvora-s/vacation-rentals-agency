import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
      setError(
        'סיסמה חלשה. חייבת לכלול לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      navigate('/my-apartments', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">הרשמה</h1>
      <p className="auth-subtitle">
        פתחי חשבון כדי לפרסם דירות. דרישת סיסמה: 8+ תווים, אות גדולה, קטנה, ספרה ותו מיוחד.
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

        <button
          type="submit"
          className="btn-primary auth-submit"
          disabled={submitting}
        >
          {submitting ? 'נרשמת...' : 'הרשמה'}
        </button>
      </form>

      <p className="auth-switch">
        כבר יש לך חשבון? <Link to="/login">היכנסי כאן</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
