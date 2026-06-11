import EditableText from '../components/EditableText';
import './AboutPage.css';

const ABOUT_HERO = '/about-hero.png';

const commitments = [
  {
    icon: '★',
    title: 'סטנדרט איכות ללא פשרות',
    text: 'כל נכס נבחר בקפידה כדי להבטיח חוויית שהייה מעולה.',
  },
  {
    icon: '♥',
    title: 'ליווי אישי ומקצועי',
    text: 'ליווי צמוד משלב החיפוש ועד סיום השהייה — בגובה העיניים.',
  },
  {
    icon: '◎',
    title: 'גישה מונחית קהילה',
    text: 'חיבור אמיתי בין שוכרים למשכירים, מתוך אמון והיכרות אישית.',
  },
];

function AboutPage() {
  return (
    <div className="about-page">
      <section
        className="about-hero"
        style={{ backgroundImage: `url(${ABOUT_HERO})` }}
      >
        <div className="about-hero-overlay" />
        <div className="about-hero-content">
          <EditableText as="span" id="about.hero.eyebrow" className="about-hero-eyebrow">
            דירות נופש
          </EditableText>
          <EditableText as="h1" id="about.hero.title">הכירו את הצוות והחזון שלנו</EditableText>
          <EditableText as="p" id="about.hero.subtitle">
            שותפים מהימנים ביצירת שהיות בלתי נשכחות
          </EditableText>
        </div>
      </section>

      <section className="about-body">
        <div className="about-container">
          <div className="about-grid">
            <article className="about-story-card">
              <header className="story-header">
                <EditableText as="span" id="about.story.label" className="story-label">
                  הסיפור שלנו
                </EditableText>
                <EditableText as="h2" id="about.story.title">
                  אודות דירות נופש: המומחיות שלנו, השקט שלכם
                </EditableText>
              </header>

              <div className="story-block">
                <EditableText as="h3" id="about.block1.title">איך הכל התחיל?</EditableText>
                <EditableText as="p" id="about.block1.lead" className="story-lead">
                  נעים מאוד, שמי פנינה שון.
                </EditableText>
                <p>
                  כמי שעוסקת בייעוץ וליווי רוכשים בנדל&quot;ן, מצאתי את עצמי פעם
                  אחר פעם הכתובת אליה פונים חברים, משפחה ומכרים כשהם זקוקים לעזרה
                  במציאת דירה איכותית לשבת, לחופשה או לאירוע מיוחד. הם חיפשו מקום
                  שיענה על הצרכים הייחודיים שלהם, בלי לבזבז זמן יקר על חיפושים
                  מתישים.
                </p>
                <p>
                  במקביל, במסגרת עבודתי עם בעלי נכסים, זיהיתי צורך מרתק: לא משנה
                  מהו העיסוק שלכם, כולנו היינו שמחים להכנסה נוספת מהצד – כזו שאינה
                  דורשת זמן יקר או מאמץ מיוחד. ראיתי בתים שעומדים ריקים בסופי שבוע
                  ובחגים, וחשבתי – למה שהנכס לא יעבוד עבורכם בזמן שאתם ממילא לא שם?
                </p>
              </div>

              <div className="story-divider" />

              <div className="story-block">
                <EditableText as="h3" id="about.block2.title">
                  מהקטלוג הדיגיטלי ועד לאתר שלפניכם
                </EditableText>
                <p>
                  מה שהתחיל כקטלוג דיגיטלי פשוט שנועד לעשות סדר, צמח והתפתח לאתר
                  שאתם רואים היום. דירות נופש הוקם מתוך מטרה כפולה:
                </p>
                <div className="mission-cards">
                  <div className="mission-card">
                    <span className="mission-tag">לשוכרים</span>
                    <p>
                      פלטפורמה קלה, נגישה ומדויקת למציאת דירת הנופש הבאה שלכם –
                      במינימום מאמץ ומקסימום התאמה לצרכים האישיים.
                    </p>
                  </div>
                  <div className="mission-card">
                    <span className="mission-tag">למשכירים</span>
                    <p>
                      ייצור הכנסה חכמה מהנכס הקיים שלכם, בראש שקט ובליווי מקצועי
                      לאורך כל הדרך.
                    </p>
                  </div>
                </div>
              </div>

              <div className="story-divider" />

              <div className="story-block">
                <EditableText as="h3" id="about.block3.title">הערך המוסף שלנו</EditableText>
                <p>
                  אנחנו מאמינים שאירוח טוב מתחיל בחיבור נכון. האתר נבנה מתוך
                  מחשבה על הפרטים הקטנים שחשובים לכם כשוכרים, ועל הפשטות והיעילות
                  שדרושה לכם כמשכירים.
                </p>
              </div>

              <blockquote className="about-invite">
                אני מזמינה אתכם להצטרף לקהילה שלנו – בין אם אתם מחפשים את המקום
                המושלם לשבת הבאה, ובין אם אתם רוצים להפוך את הבית שלכם לנכס מניב.
              </blockquote>
            </article>

            <aside className="about-sidebar">
              <div className="sidebar-panel">
                <EditableText as="h2" id="about.sidebar.title" className="sidebar-title">
                  המחויבות שלנו
                </EditableText>
                <ul className="commitment-list">
                  {commitments.map((item) => (
                    <li key={item.title} className="commitment-item">
                      <span className="commitment-icon-wrap">{item.icon}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="founder-card">
                <div className="founder-photo">
                  <span>פ</span>
                </div>
                <div className="founder-info">
                  <strong className="founder-name">פנינה שון</strong>
                  <span className="founder-role">מייסדת ומנכ&quot;לית</span>
                  <p>
                    מלווה שוכרים ומשכירים בנדל&quot;ן נופש, עם דגש על שירות אישי
                    וחיבור מדויק בין נכס לאורח.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
