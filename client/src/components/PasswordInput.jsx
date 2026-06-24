import { useState } from 'react';
import './PasswordInput.css';

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
  hint,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <div className="password-input-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="auth-input password-input"
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          dir="ltr"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'הסתר סיסמה' : 'הצג סיסמה'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </div>
      {hint && <span className="auth-hint">{hint}</span>}
    </div>
  );
}
