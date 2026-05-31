import './HowToFind.css';

const STEPS = [
  {
    icon: '🗺️',
    title: 'סינון ובחירה',
    text: 'השתמשי בקטגוריות ובמיקום כדי להתמקד במאגר הדירות הרלוונטי לפי גודל וסוג.',
  },
  {
    icon: '⭐',
    title: 'בדיקת המלצות',
    text: 'קראי מה אורחים קודמים סיפרו על הדירה ועל בעלי הנכס בראש שקט.',
  },
  {
    icon: '📞',
    title: 'יצירת קשר והזמנה',
    text: 'יוצרים קשר ישירות עם בעל הנכס ומסכמים תאריכים ועסקה ללא עמלות תיווך.',
  },
];

function HowToFind() {
  return (
    <section className="how-find section-container">
      <h2 className="categories-title">איך מוצאים דירה?</h2>
      <div className="how-find-grid">
        {STEPS.map((s) => (
          <div key={s.title} className="how-find-step">
            <span className="how-find-icon" aria-hidden="true">
              {s.icon}
            </span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowToFind;
