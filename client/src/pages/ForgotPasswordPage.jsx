import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import './AuthPages.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'אירעה שגיאה. נסי שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-wrap auth-verify-card">
        <span className="auth-verify-icon" aria-hidden="true">📩</span>
        <h1 className="auth-title">בדקי את תיבת המייל</h1>
        <p className="auth-subtitle">
          אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה. הקישור תקף ל-24 שעות.
        </p>
        <Link to="/login" className="btn-primary auth-submit">
          חזרה להתחברות
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <h1 className="auth-title">שכחתי סיסמה</h1>
      <p className="auth-subtitle">
        הזיני את כתובת האימייל של החשבון, ונשלח אליך קישור לבחירת סיסמה חדשה.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label htmlFor="forgot-email">אימייל</label>
          <input
            id="forgot-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            dir="ltr"
          />
        </div>

        <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'שולחת...' : 'שליחת קישור לאיפוס'}
        </button>
      </form>

      <p className="auth-switch">
        נזכרת בסיסמה? <Link to="/login">חזרה להתחברות</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
