import { Link } from 'react-router-dom';
import '../pages/ContactPage.css';

/**
 * אישור תנאי שימוש ומדיניות פרטיות (כמו בצור קשר).
 */
export default function PolicyConsentCheckbox({ checked, onChange, error, id = 'policy-consent' }) {
  return (
    <div className={`contact-consent ${error ? 'contact-consent--error' : ''}`}>
      <label className="contact-consent-label" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="contact-consent-box" aria-hidden="true" />
        <span>
          אני מאשר/ת את{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer">
            תנאי השימוש
          </Link>{' '}
          ו{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">
            מדיניות הפרטיות
          </Link>
        </span>
      </label>
      {error && (
        <span className="contact-field-error contact-consent-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
