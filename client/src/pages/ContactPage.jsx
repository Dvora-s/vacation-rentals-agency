import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitContactMessage } from '../services/api';
import './ContactPage.css';

const MESSAGE_MAX = 1000;
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'tivuch.shabat@gmail.com';
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '053-8882145';

const TRUST_ITEMS = [
  'הנתונים מועברים בצורה מאובטחת',
  'המידע לא יועבר לצד שלישי',
  'שימוש בפרטי ההתקשרות לצורך מענה בלבד',
  'עמידה במדיניות הפרטיות של האתר',
];

function CheckIcon() {
  return (
    <svg className="contact-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" className="contact-check-bg" />
      <path
        d="M6 10.2l2.4 2.4L14 7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="contact-hero-icon">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <path
        d="M24 14c-5.5 0-10 3.6-10 8v4l-2 3h24l-2-3v-4c0-4.4-4.5-8-10-8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M19 32c1.2 2 3.2 3 5 3s3.8-1 5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function validateForm(values) {
  const errors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'נא להזין שם מלא';
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'השם קצר מדי';
  }

  if (!values.email.trim()) {
    errors.email = 'נא להזין כתובת אימייל';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'כתובת אימייל לא תקינה';
  }

  if (values.phone.trim() && !/^[\d\s\-+()]{7,20}$/.test(values.phone.trim())) {
    errors.phone = 'מספר טלפון לא תקין';
  }

  if (!values.message.trim()) {
    errors.message = 'נא לכתוב הודעה';
  } else if (values.message.trim().length < 10) {
    errors.message = 'ההודעה קצרה מדי (לפחות 10 תווים)';
  }

  if (!values.consent) {
    errors.consent = 'יש לאשר את תנאי השימוש ומדיניות הפרטיות';
  }

  return errors;
}

function FloatingField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  dir,
  autoComplete,
  multiline = false,
  maxLength,
  onInput,
  inputRef,
  rows = 4,
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  const sharedProps = {
    id,
    value,
    onChange,
    onBlur: (e) => {
      setFocused(false);
      onBlur?.(e);
    },
    onFocus: () => setFocused(true),
    className: 'contact-input',
    autoComplete,
    dir,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
  };

  return (
    <div
      className={[
        'contact-field',
        active ? 'contact-field--active' : '',
        focused ? 'contact-field--focused' : '',
        error ? 'contact-field--error' : '',
        multiline ? 'contact-field--textarea' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {multiline ? (
        <textarea
          {...sharedProps}
          ref={inputRef}
          rows={rows}
          maxLength={maxLength}
          onInput={onInput}
        />
      ) : (
        <input {...sharedProps} type={type} ref={inputRef} />
      )}
      <label htmlFor={id}>{label}</label>
      {error && (
        <span id={`${id}-error`} className="contact-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function ContactPage() {
  const { user, isAuthenticated } = useAuth();
  const messageRef = useRef(null);
  const prefilledRef = useRef(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
    consent: false,
  });
  const [touched, setTouched] = useState({});
  const [submitState, setSubmitState] = useState('idle');
  const [prefilled, setPrefilled] = useState(false);

  const errors = validateForm(form);
  const showError = (field) => touched[field] && errors[field];

  useEffect(() => {
    if (submitState !== 'success') return;
    const timer = setTimeout(() => setSubmitState('idle'), 4500);
    return () => clearTimeout(timer);
  }, [submitState]);

  useEffect(() => {
    if (!isAuthenticated || !user || prefilledRef.current) return;
    setForm((prev) => ({
      ...prev,
      fullName: user.full_name || prev.fullName,
      email: user.email || prev.email,
      phone: user.phone || prev.phone,
    }));
    prefilledRef.current = true;
    setPrefilled(true);
  }, [isAuthenticated, user]);

  const resizeMessage = useCallback(() => {
    const el = messageRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeMessage();
  }, [form.message, resizeMessage]);

  function update(field) {
    return (e) => {
      const val = field === 'consent' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));
      if (submitState === 'success') setSubmitState('idle');
    };
  }

  function markTouched(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      message: true,
      consent: true,
    });

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitState('submitting');
    try {
      await submitContactMessage({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        message: form.message.trim(),
      });
      setSubmitState('success');
      setForm((prev) => ({
        ...prev,
        message: '',
        consent: false,
      }));
      setTouched({});
      prefilledRef.current = false;
    } catch {
      setSubmitState('error');
    }
  }

  function buttonLabel() {
    if (submitState === 'submitting') return 'שולח...';
    if (submitState === 'success') return 'ההודעה נשלחה בהצלחה';
    if (submitState === 'error') return 'התרחשה שגיאה. נסו שוב.';
    return 'שליחת הודעה';
  }

  return (
    <div className="contact-page">
      <div className="contact-page-bg" aria-hidden="true" />

      <div className="contact-page-inner section-container">
        <header className="contact-hero">
          <SupportIcon />
          <h1 className="contact-hero-title">צרו קשר</h1>
          <p className="contact-hero-subtitle">
            יש לכם שאלה, בקשה או הצעה? נשמח לשמוע מכם ולחזור אליכם בהקדם.
          </p>
        </header>

        <div className="contact-layout">
          <div className="contact-form-card">
            {prefilled && (
              <p className="contact-prefill-note" role="status">
                <span className="contact-prefill-dot" aria-hidden="true" />
                הפרטים נמשכו מהחשבון שלך
              </p>
            )}

            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <FloatingField
                id="contact-name"
                label="שם מלא"
                value={form.fullName}
                onChange={update('fullName')}
                onBlur={() => markTouched('fullName')}
                error={showError('fullName') && errors.fullName}
                autoComplete="name"
              />

              <FloatingField
                id="contact-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={update('email')}
                onBlur={() => markTouched('email')}
                error={showError('email') && errors.email}
                autoComplete="email"
                dir="ltr"
              />

              <FloatingField
                id="contact-phone"
                label="טלפון"
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                onBlur={() => markTouched('phone')}
                error={showError('phone') && errors.phone}
                autoComplete="tel"
                dir="ltr"
              />

              <div className="contact-message-wrap">
                <FloatingField
                  id="contact-message"
                  label="הודעה"
                  multiline
                  value={form.message}
                  onChange={update('message')}
                  onBlur={() => markTouched('message')}
                  error={showError('message') && errors.message}
                  maxLength={MESSAGE_MAX}
                  inputRef={messageRef}
                  onInput={resizeMessage}
                />
                <span className="contact-char-count" aria-live="polite">
                  {form.message.length}/{MESSAGE_MAX}
                </span>
              </div>

              <div className={`contact-consent ${showError('consent') ? 'contact-consent--error' : ''}`}>
                <label className="contact-consent-label">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={update('consent')}
                    onBlur={() => markTouched('consent')}
                  />
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
                {showError('consent') && (
                  <span className="contact-field-error contact-consent-error" role="alert">
                    {errors.consent}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={[
                  'contact-submit',
                  submitState === 'success' ? 'contact-submit--success' : '',
                  submitState === 'error' ? 'contact-submit--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={submitState === 'submitting' || submitState === 'success'}
              >
                {submitState === 'submitting' && <span className="contact-submit-spinner" aria-hidden="true" />}
                {buttonLabel()}
              </button>
            </form>
          </div>

          <aside className="contact-sidebar">
            <section className="contact-trust-card" aria-labelledby="contact-trust-title">
              <h2 id="contact-trust-title" className="contact-trust-title">
                אנחנו שומרים על פרטיותכם
              </h2>
              <ul className="contact-trust-list">
                {TRUST_ITEMS.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="contact-info" aria-label="דרכי התקשרות">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-info-card">
                <span className="contact-info-icon" aria-hidden="true">
                  ✉
                </span>
                <span className="contact-info-label">דוא״ל לתמיכה</span>
                <span className="contact-info-value" dir="ltr">
                  {SUPPORT_EMAIL}
                </span>
              </a>
              <a href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`} className="contact-info-card">
                <span className="contact-info-icon" aria-hidden="true">
                  ☎
                </span>
                <span className="contact-info-label">טלפון לתמיכה</span>
                <span className="contact-info-value" dir="ltr">
                  {SUPPORT_PHONE}
                </span>
              </a>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
