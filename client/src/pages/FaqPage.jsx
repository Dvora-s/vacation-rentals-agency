import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFaq } from '../services/api';
import { FAQ_FALLBACK } from '../data/faqFallback.js';
import EditableText from '../components/EditableText';
import './FaqPage.css';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function FaqItem({ id, question, answer }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const buttonId = `faq-btn-${id}`;

  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="faq-question"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="faq-question-text">{question}</span>
        <span className="faq-toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="faq-answer"
        hidden={!open}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
}

function FaqPage() {
  const { isAdmin } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getFaq();
        const list = Array.isArray(data?.sections) ? data.sections : [];
        if (active) {
          setSections(list);
          setLoadError(null);
        }
      } catch (err) {
        if (active) {
          setLoadError(err.message);
          setSections(FAQ_FALLBACK.sections);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="faq-page section-container">
      <header className="faq-header">
        <div className="faq-header-row">
          <div>
            <EditableText as="h1" id="faq.title" className="page-title">
              שאלות נפוצות
            </EditableText>
            <EditableText as="p" id="faq.subtitle" className="page-subtitle">
              ריכזנו עבורכם את התשובות לשאלות הנפוצות ביותר. לחצו על השאלה כדי לפתוח את התשובה.
            </EditableText>
            {USE_MOCK && isAdmin && (
              <p className="faq-warn" role="status">
                <strong>מצב דמו (VITE_USE_MOCK):</strong> כאן מוצג תוכן סטטי מהקוד — לא מהמסד. עמוד הניהול טוען רק מ־DB; כדי לסנכרן, הגדירו{' '}
                <code>VITE_USE_MOCK=false</code> ב־<code>client/.env</code>, הפעילו מחדש את Vite, והריצו בשרת{' '}
                <code>npm run setup-faq</code>.
              </p>
            )}
            {loadError && (
              <p className="faq-warn" role="status">
                לא נטען מהשרת ({loadError}) — מוצג תוכן גיבוי. ודאי שהרצת <code>npm run setup-faq</code> בשרת.
              </p>
            )}
          </div>
          {isAdmin && (
            <Link to="/admin/faq" className="btn-outline-gold faq-admin-link">
              ניהול שאלות (מנהל)
            </Link>
          )}
        </div>
      </header>

      {loading && <p className="loading-text">טוען...</p>}

      {!loading &&
        sections.map((section) => (
          <section key={section.id} className="faq-section">
            <h2 className="faq-section-title">
              <span aria-hidden="true">{section.icon}</span> {section.title}
            </h2>
            <div className="faq-list">
              {(section.items || []).map((item) => (
                <FaqItem key={item.id} id={item.id} question={item.question} answer={item.answer} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

export default FaqPage;
