import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApartments } from '../services/api';
import {
  parseQuery,
  detectIntent,
  findMatches,
  describeCriteria,
  buildSearchUrl,
  mergeCriteria,
  emptyCriteria,
  followUpPrompt,
} from '../data/dirobot';
import { knowledgeAnswer } from '../data/dirobotKnowledge';
import './styles/DiroBot.css';

const WELCOME =
  'היי, נעים מאוד — אני דירובוט 🏠✨ אני כאן כדי לעזור לכם למצוא דירת נופש, וגם לענות על כל שאלה על האתר: איך מפרסמים, כמה זה עולה, יצירת קשר ועוד. במה אפשר לעזור?';

const SUGGESTIONS = [
  'דירה עם 2 חדרים בבית שמש',
  'איך מפרסמים דירה?',
  'כמה עולה לפרסם?',
  'איך יוצרים קשר?',
];

let messageId = 0;
const nextId = () => ++messageId;

const initialMessages = () => [{ id: nextId(), role: 'bot', text: WELCOME }];

function DiroBot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // זיכרון שיחה — מאפשר לחדד בקשות ("ועכשיו עד 600 ש\"ח") על בסיס מה שכבר נאמר.
  const criteriaRef = useRef(emptyCriteria());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function pushBot(payload) {
    setMessages((prev) => [...prev, { id: nextId(), role: 'bot', ...payload }]);
  }

  function resetConversation() {
    criteriaRef.current = emptyCriteria();
    setMessages(initialMessages());
    setInput('');
    setThinking(false);
    if (inputRef.current) inputRef.current.focus();
  }

  async function respondTo(text) {
    const intent = detectIntent(text);

    if (intent === 'reset') {
      criteriaRef.current = emptyCriteria();
      pushBot({ text: 'בטח! התחלנו דף חדש 🙂 מה תרצו לחפש הפעם?' });
      return;
    }

    if (intent === 'thanks') {
      pushBot({
        text: 'בשמחה רבה! 🙏 אם תרצו לחפש עוד דירה או לחדד את החיפוש — אני כאן.',
      });
      return;
    }

    if (intent === 'greeting') {
      pushBot({
        text: 'שלום שלום! 😊 ספרו לי כמה חדרים, באיזה אזור ולאיזו תקופה אתם מחפשים, ואצא לחפש בשבילכם.',
      });
      return;
    }

    if (intent === 'help') {
      pushBot({
        text:
          'בכיף! 😊 אני יכול:\n• למצוא לכם דירה לפי סוג נכס, חדרים, נפשות, עיר, תקציב ותקופה.\n• לענות על שאלות על האתר: איך מפרסמים, כמה זה עולה, כללי האישור, יצירת קשר, חידוש מודעה ועוד.\n\nפשוט שאלו אותי כל שאלה. 🙂',
      });
      return;
    }

    // חיפוש או שאלת ידע — קודם בודקים אם זו בקשת חיפוש "חזקה" (עיר/חדרים/נפשות/סוג/תקופה).
    const parsed = parseQuery(text);
    const hasStrongSearch =
      parsed.city || parsed.bedrooms || parsed.guests || parsed.propertyType || parsed.categoryId;

    // שאלות על האתר (פרסום, מחיר, כללים, יצירת קשר...) — נענות מתוך מאגר הידע.
    if (!hasStrongSearch) {
      const kb = knowledgeAnswer(text);
      if (kb) {
        pushBot({ text: kb.text, actions: kb.actions });
        return;
      }
    }

    if (intent === 'contact') {
      pushBot({
        text:
          'יצירת הקשר נעשית ישירות מול בעל הדירה דרך עמוד המודעה: שם תמצאו כפתורי התקשרות, וואטסאפ וכן כפתור "שליחת הודעה" שמעביר את פנייתכם למייל של בעל הנכס. אפשר גם לפנות לצוות האתר דרך עמוד "צור קשר".',
        actions: [{ label: 'לעמוד צור קשר', to: '/contact' }],
      });
      return;
    }

    // חיפוש — ממזגים את הבקשה החדשה עם מה שכבר ידוע (זיכרון שיחה).
    if (!parsed.hasCriteria && !criteriaRef.current.hasCriteria) {
      pushBot({
        text:
          'אשמח לעזור! 🤔 אפשר לבקש דירה (למשל "דירה ל-6 נפשות בירושלים לסוכות") או לשאול אותי שאלה על האתר — איך מפרסמים, כמה זה עולה, יצירת קשר ועוד.',
      });
      return;
    }

    const criteria = mergeCriteria(criteriaRef.current, parsed);
    criteriaRef.current = criteria;

    let apartments = [];
    try {
      apartments = await getApartments();
    } catch {
      pushBot({ text: 'אופס, לא הצלחתי לטעון את רשימת הדירות כרגע. נסו שוב בעוד רגע 🙏' });
      return;
    }

    const { matches, total, relaxed } = findMatches(apartments, criteria);
    const understood = describeCriteria(criteria);

    if (matches.length === 0) {
      pushBot({
        text: `חיפשתי ${understood ? understood + ' ' : ''}ולא מצאתי כרגע דירה מתאימה 😕 אפשר לשנות את הדרישות, או לעיין בכל הדירות.`,
        actions: [{ label: 'לכל הדירות', to: '/apartments' }],
      });
      return;
    }

    const lead =
      (understood ? `מצוין! חיפשתי ${understood}. ` : '') +
      (relaxed.length ? `${relaxed.join('; ')}. ` : '') +
      `הנה ${matches.length} מתוך ${total} דירות שמתאימות לכם:`;

    pushBot({
      text: lead,
      apartments: matches,
      actions:
        total > matches.length
          ? [{ label: `צפייה בכל ${total} התוצאות`, to: buildSearchUrl(criteria) }]
          : [{ label: 'מעבר לחיפוש המלא', to: buildSearchUrl(criteria) }],
    });

    // שאלת המשך ידידותית לחידוד נוסף (רק כאשר יש עוד מה לצמצם).
    const followUp = followUpPrompt(criteria);
    if (total > matches.length && followUp) {
      pushBot({ text: `רוצים שאצמצם? ${followUp}` });
    }
  }

  async function handleSend(text) {
    const clean = (text ?? input).trim();
    if (!clean || thinking) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: clean }]);
    setInput('');
    setThinking(true);
    try {
      await respondTo(clean);
    } finally {
      setThinking(false);
    }
  }

  function handleNavigate(to) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="dirobot-fab"
          onClick={() => setOpen(true)}
          aria-label="פתיחת דירובוט"
        >
          <span className="dirobot-fab-icon" aria-hidden="true">💬</span>
          <span className="dirobot-fab-label">
            <strong>דירובוט</strong>
            <small>למציאת הדירה בקלות ובמהירות</small>
          </span>
        </button>
      )}

      {open && (
        <div className="dirobot-panel" role="dialog" aria-label="דירובוט — עוזר חיפוש דירות">
          <header className="dirobot-header">
            <div className="dirobot-header-title">
              <span className="dirobot-avatar" aria-hidden="true">🏠</span>
              <div>
                <strong>דירובוט</strong>
                <span className="dirobot-status">כאן כדי למצוא לכם דירה</span>
              </div>
            </div>
            <div className="dirobot-header-actions">
              <button
                type="button"
                className="dirobot-newchat"
                onClick={resetConversation}
                disabled={messages.length <= 1 && !thinking}
                title="שיחה חדשה"
              >
                ↻ שיחה חדשה
              </button>
              <button
                type="button"
                className="dirobot-close"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="dirobot-messages" ref={scrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={`dirobot-msg dirobot-msg-${m.role}`}>
                {m.text && <p className="dirobot-bubble">{m.text}</p>}

                {m.apartments?.length > 0 && (
                  <div className="dirobot-cards">
                    {m.apartments.map((apt) => (
                      <button
                        key={apt.id}
                        type="button"
                        className="dirobot-card"
                        onClick={() => handleNavigate(`/apartments/${apt.id}`)}
                      >
                        {apt.image && (
                          <img className="dirobot-card-img" src={apt.image} alt="" />
                        )}
                        <span className="dirobot-card-body">
                          <span className="dirobot-card-title">{apt.title}</span>
                          <span className="dirobot-card-meta">
                            📍 {apt.location} · 🚪 {apt.bedrooms} חד׳ · 👥 {apt.max_guests}
                          </span>
                          <span className="dirobot-card-price">₪{apt.price_per_night} / לילה</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {m.actions?.length > 0 && (
                  <div className="dirobot-actions">
                    {m.actions.map((a) => (
                      <button
                        key={a.to + a.label}
                        type="button"
                        className="dirobot-action"
                        onClick={() => handleNavigate(a.to)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="dirobot-msg dirobot-msg-bot">
                <p className="dirobot-bubble dirobot-typing">
                  <span></span><span></span><span></span>
                </p>
              </div>
            )}

            {messages.length <= 1 && !thinking && (
              <div className="dirobot-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="dirobot-suggestion"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="dirobot-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="dirobot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="מה אתם מחפשים?"
              aria-label="הודעה לדירובוט"
            />
            <button type="submit" className="dirobot-send" disabled={thinking || !input.trim()}>
              שליחה
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default DiroBot;
