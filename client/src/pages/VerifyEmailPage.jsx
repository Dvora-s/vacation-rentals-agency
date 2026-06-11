import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { completeEmailVerification } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // מונע ריצה כפולה ב-StrictMode
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('קישור האימות חסר או אינו תקין.');
      return;
    }

    completeEmailVerification(token)
      .then((result) => {
        // אם התקבל טוקן — המשתמש כבר מחובר; מעבירים ישירות לדף הבית.
        if (result?.token) {
          navigate('/', { replace: true });
          return;
        }
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'אימות האימייל נכשל.');
      });
  }, [token, completeEmailVerification, navigate]);

  return (
    <div className="auth-wrap auth-verify-card">
      {status === 'loading' && (
        <>
          <span className="auth-verify-icon" aria-hidden="true">⏳</span>
          <h1 className="auth-title">מאמתים את החשבון…</h1>
          <p className="auth-subtitle">רגע אחד בבקשה.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <span className="auth-verify-icon" aria-hidden="true">✅</span>
          <h1 className="auth-title">החשבון אומת בהצלחה!</h1>
          <p className="auth-subtitle">
            האימייל שלכם אומת והחשבון הופעל. אפשר להתחבר ולהתחיל לפרסם דירות.
          </p>
          <Link to="/login" className="btn-primary auth-submit">
            למסך ההתחברות
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="auth-verify-icon" aria-hidden="true">⚠️</span>
          <h1 className="auth-title">האימות נכשל</h1>
          <p className="auth-subtitle">{message}</p>
          <Link to="/register" className="btn-primary auth-submit">
            חזרה להרשמה
          </Link>
          <p className="auth-switch">
            כבר אימתת? <Link to="/login">להתחברות</Link>
          </p>
        </>
      )}
    </div>
  );
}

export default VerifyEmailPage;
