import { useEffect, useId, useRef, useState } from 'react';
import './styles/Combobox.css';

// תיבת בחירה עם חיפוש: בוחרים ערך מתוך רשימה (options), עם אפשרות סינון בהקלדה.
// value/onChange — הערך הנבחר (מחרוזת). options — מערך מחרוזות.
function Combobox({
  value = '',
  onChange,
  options = [],
  placeholder = '',
  disabled = false,
  required = false,
  emptyText = 'אין תוצאות',
  className = '',
  id,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  // כשהתפריט סגור מציגים את הערך הנבחר; כשפתוח מציגים את הטקסט שמקלידים לסינון.
  const inputValue = open ? query : value;

  const filtered = open
    ? options.filter((opt) => opt.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openMenu() {
    if (disabled) return;
    setQuery('');
    setHighlight(0);
    setOpen(true);
  }

  function selectOption(opt) {
    onChange?.(opt);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) selectOption(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className={`combobox ${className}`.trim()} ref={wrapRef}>
      <div className="combobox-control">
        <input
          id={inputId}
          type="text"
          className="auth-input combobox-input"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            if (!open) setOpen(true);
          }}
          onFocus={openMenu}
          onKeyDown={handleKeyDown}
          aria-expanded={open}
          aria-controls={`${inputId}-list`}
          role="combobox"
        />
        <span className="combobox-arrow" aria-hidden="true">
          ▾
        </span>
        {/* שדה נסתר לאכיפת required של הטופס */}
        {required && (
          <input
            tabIndex={-1}
            aria-hidden="true"
            className="combobox-required"
            value={value}
            required
            onChange={() => {}}
          />
        )}
      </div>

      {open && (
        <ul className="combobox-list" id={`${inputId}-list`} role="listbox">
          {filtered.length === 0 && <li className="combobox-empty">{emptyText}</li>}
          {filtered.map((opt, index) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              className={`combobox-option ${index === highlight ? 'is-highlight' : ''} ${
                opt === value ? 'is-selected' : ''
              }`.trim()}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Combobox;
