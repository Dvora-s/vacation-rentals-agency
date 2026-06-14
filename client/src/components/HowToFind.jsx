import EditableText from './EditableText';
import './styles/HowToFind.css';

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
      <EditableText as="h2" id="home.howfind.title" className="categories-title">
        איך מוצאים דירה?
      </EditableText>
      <div className="how-find-grid">
        {STEPS.map((s, i) => (
          <div key={s.title} className="how-find-step">
            <span className="how-find-icon" aria-hidden="true">
              {s.icon}
            </span>
            <EditableText as="h3" id={`home.howfind.step.${i}.title`}>
              {s.title}
            </EditableText>
            <EditableText as="p" id={`home.howfind.step.${i}.text`}>
              {s.text}
            </EditableText>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowToFind;
