import { Link } from 'react-router-dom';
import '../pages/AuthPages.css';

export default function EmailVerificationPrompt({
  email,
  message,
  mailSent,
  verifyUrl,
  onResend,
  resending = false,
  resent = false,
  resendError = null,
}) {
  return (
    <div className="auth-notice auth-notice-verify">
      {message && <p>{message}</p>}
      {email && (
        <p className="auth-verify-email">
          אימייל: <strong dir="ltr">{email}</strong>
        </p>
      )}

      {verifyUrl && (
        <a href={verifyUrl} className="auth-verify-link-btn">
          לחצי כאן לאימות החשבון
        </a>
      )}

      {onResend && (
        <button
          type="button"
          className="auth-resend-btn"
          onClick={onResend}
          disabled={resending || (resent && mailSent === true)}
        >
          {resending ? 'שולח...' : resent && mailSent !== false ? 'מייל אימות נשלח שוב' : 'שלחי מייל אימות שוב'}
        </button>
      )}

      {mailSent === false && (
        <p className="auth-resend-hint">
          שליחת המייל מהשרת לא זמינה כרגע — השתמשי בקישור האימות למעלה.
        </p>
      )}

      {resendError && <p className="auth-resend-error">{resendError}</p>}
      {resent && mailSent && !resendError && (
        <p className="auth-resend-success">בדקו את תיבת הדואר (וגם ספאם).</p>
      )}

      <p className="auth-switch auth-switch-inline">
        אימתת את החשבון? <Link to="/login">להתחברות</Link>
      </p>
    </div>
  );
}
