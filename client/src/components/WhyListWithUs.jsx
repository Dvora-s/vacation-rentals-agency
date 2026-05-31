import { Link } from 'react-router-dom';
import './WhyListWithUs.css';

const REASONS = [
  {
    title: 'חשיפה גדולה לקהל יעד',
    text: 'הדירה שלך נחשפת לאלפי משפחות שמחפשות בדיוק את האזור והקטגוריה שלך.',
  },
  {
    title: 'אפס עמלות תיווך',
    text: 'משלמים רק על פרסום: ₪30 בלבד לחודש לדירה. ההסכמה עם השוכר ישירה.',
  },
  {
    title: 'ניהול פשוט מהאזור האישי',
    text: 'מעדכנים פרטים, מחירים ותמונות מתי שרוצים. המנהל מאשר במהירות.',
  },
];

function WhyListWithUs() {
  return (
    <section className="why-list section-container">
      <div className="why-list-card">
        <div className="why-list-text">
          <h2>למה שווה לפרסם אצלנו?</h2>
          <p className="why-list-lead">
            למשפחות יש נכס לראון? יש לכם דירה לפרסום ולמכירה לקהל איכותי במיוחד —
            ללא עמלות תיווך.
          </p>
          <ul className="why-list-bullets">
            {REASONS.map((r) => (
              <li key={r.title}>
                <strong>{r.title}.</strong> <span>{r.text}</span>
              </li>
            ))}
          </ul>
          <div className="why-list-actions">
            <Link to="/apartments" className="btn-outline-gold">
              מצא דירה
            </Link>
            <Link to="/list-apartment" className="btn-primary">
              פרסם נכס
            </Link>
          </div>
        </div>
        <div
          className="why-list-image"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80')",
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

export default WhyListWithUs;
