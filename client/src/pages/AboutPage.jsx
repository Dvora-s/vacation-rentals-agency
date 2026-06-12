import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import '../components/PageHero.css';
import './AboutPage.css';

const ABOUT_HERO = '/about-hero.png';

const VALUES = [
  { icon: '🤝', title: 'חיבור אישי', text: 'אירוח טוב מתחיל בחיבור נכון בין שוכר למשכיר' },
  { icon: '✨', title: 'פשטות', text: 'ממשק נגיש וברור — בלי סיבוכים מיותרים' },
  { icon: '🛡️', title: 'אמינות', text: 'ליווי מקצועי ושקיפות לאורך כל הדרך' },
];

function AboutPage() {
  return (
    <div className="about-page">
      <EditableImage
        id="about.hero"
        src={ABOUT_HERO}
        mode="background"
        as="section"
        className="page-hero about-hero"
      >
        <div className="page-hero-overlay" />
        <div className="page-hero-inner">
          <EditableText as="span" id="about.hero.eyebrow" className="page-hero-eyebrow">
            דירות נופש
          </EditableText>
          <EditableText as="h1" id="about.hero.title" className="page-hero-title">
            הכירו את הצוות והחזון שלנו
          </EditableText>
          <EditableText as="p" id="about.hero.subtitle" className="page-hero-subtitle">
            שותפים מהימנים ביצירת שהיות בלתי נשכחות
          </EditableText>
        </div>
      </EditableImage>

      <section className="about-body">
        <div className="about-container">
          {/* כותרת ראשית */}
          <header className="about-intro">
            <span className="about-intro-line" aria-hidden="true" />
            <EditableText as="span" id="about.story.label" className="about-intro-label">
              הסיפור שלנו
            </EditableText>
            <EditableText as="h2" id="about.story.title" className="about-intro-title">
              אודות דירות נופש: המומחיות שלנו, השקט שלכם
            </EditableText>
          </header>

          {/* פתיחה אישית */}
          <div className="about-founder-block">
            <div className="about-founder-accent" aria-hidden="true" />
            <div className="about-founder-content">
              <EditableText as="h3" id="about.block1.title" className="about-section-title">
                איך הכל התחיל?
              </EditableText>
              <EditableText as="p" id="about.block1.lead" className="about-founder-name">
                נעים מאוד, שמי פנינה שון.
              </EditableText>
              <p className="about-text">
                כמי שעוסקת בייעוץ וליווי רוכשים בנדל&quot;ן, מצאתי את עצמי פעם אחר פעם
                הכתובת אליה פונים חברים, משפחה ומכרים כשהם זקוקים לעזרה במציאת דירה
                איכותית לשבת, לחופשה או לאירוע מיוחד. הם חיפשו מקום שיענה על הצרכים
                הייחודיים שלהם, בלי לבזבז זמן יקר על חיפושים מתישים.
              </p>
              <p className="about-text">
                במקביל, במסגרת עבודתי עם בעלי נכסים, זיהיתי צורך מרתק: לא משנה מהו
                העיסוק שלכם, כולנו היינו שמחים להכנסה נוספת מהצד – כזו שאינה דורשת זמן
                יקר או מאמץ מיוחד. ראיתי בתים שעומדים ריקים בסופי שבוע ובחגים, וחשבתי –
                למה שהנכס לא יעבוד עבורכם בזמן שאתם ממילא לא שם?
              </p>
            </div>
          </div>

          {/* מסע האתר */}
          <article className="about-journey-card">
            <EditableText as="h3" id="about.block2.title" className="about-section-title">
              מהקטלוג הדיגיטלי ועד לאתר שלפניכם
            </EditableText>
            <p className="about-text about-journey-lead">
              מה שהתחיל כקטלוג דיגיטלי פשוט שנועד לעשות סדר, צמח והתפתח לאתר שאתם רואים
              היום. דירות נופש הוקם מתוך מטרה כפולה:
            </p>

            <div className="about-mission-grid">
              <div className="about-mission-card about-mission-renters">
                <span className="about-mission-icon" aria-hidden="true">🏡</span>
                <span className="about-mission-tag">לשוכרים</span>
                <p>
                  פלטפורמה קלה, נגישה ומדויקת למציאת דירת הנופש הבאה שלכם – במינימום
                  מאמץ ומקסימום התאמה לצרכים האישיים.
                </p>
              </div>
              <div className="about-mission-card about-mission-hosts">
                <span className="about-mission-icon" aria-hidden="true">💰</span>
                <span className="about-mission-tag">למשכירים</span>
                <p>
                  ייצור הכנסה חכמה מהנכס הקיים שלכם, בראש שקט ובליווי מקצועי לאורך כל
                  הדרך.
                </p>
              </div>
            </div>
          </article>

          {/* ערכים */}
          <div className="about-values">
            <EditableText as="h3" id="about.block3.title" className="about-values-heading">
              הערך המוסף שלנו
            </EditableText>
            <p className="about-text about-values-lead">
              אנחנו מאמינים שאירוח טוב מתחיל בחיבור נכון. האתר נבנה מתוך מחשבה על
              הפרטים הקטנים שחשובים לכם כשוכרים, ועל הפשטות והיעילות שדרושה לכם
              כמשכירים.
            </p>
            <ul className="about-values-grid">
              {VALUES.map((v) => (
                <li key={v.title} className="about-value-item">
                  <span className="about-value-icon" aria-hidden="true">{v.icon}</span>
                  <strong>{v.title}</strong>
                  <span>{v.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* הזמנה */}
          <blockquote className="about-cta">
            <span className="about-cta-quote" aria-hidden="true">&ldquo;</span>
            <p>
              אני מזמינה אתכם להצטרף לקהילה שלנו – בין אם אתם מחפשים את המקום המושלם
              לשבת הבאה, ובין אם אתם רוצים להפוך את הבית שלכם לנכס מניב.
            </p>
            <footer className="about-cta-signature">— פנינה שון, מייסדת דירות נופש</footer>
          </blockquote>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
