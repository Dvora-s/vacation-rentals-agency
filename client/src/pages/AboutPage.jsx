import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import '../components/styles/PageHero.css';
import './AboutPage.css';

const ABOUT_HERO = '/about-hero.png';

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
        <article className="about-prose">
          <header className="about-prose-header">
            <EditableText as="span" id="about.story.label" className="about-prose-label">
              אודות
            </EditableText>
            <EditableText as="h2" id="about.story.title" className="about-prose-title">
              דירות נופש: המומחיות שלנו, השקט שלכם
            </EditableText>
          </header>

          <EditableText as="p" id="about.block1.lead" className="about-text">
            פלטפורמת דירות נופש הוקמה כדי לחבר בין שתי הזדמנויות: משפחות המחפשות מקום
            אירוח איכותי ומדויק לשבתות וחגים, ובעלי נכסים שיכולים להפיק הכנסה נוספת מהבית
            שלהם בימים שבהם הם ממילא מחוץ לעיר.
          </EditableText>

          <p className="about-text">
            האתר נולד מתוך זיהוי הקושי של משפחות ונופשים בחיפוש המתיש אחר דירה איכותית,
            נקייה ומותאמת בדיוק לצרכים הייחודיים של שבת או אירוע מיוחד, לצד הרצון של בעלי
            נכסים למקסם את פוטנציאל הנכס שברשותם בראש שקט. הפלטפורמה מחברת בין שני הצרכים
            הללו בצורה חלקה, מקצועית ומדויקת.
          </p>

          <EditableText as="h3" id="about.block2.title" className="about-subheading">
            מה אנחנו מציעים?
          </EditableText>

          <p className="about-text">
            <strong>למשכירים – הבית פנוי? הוא מרוויח.</strong>{' '}
            פתרון חכם ופשוט שמאפשר לכם לנצל את הימים שבהם אתם ממילא מחוץ לבית, ולייצר
            מהם הכנסה מהצד בליווי מקצועי, בביטחון מלא ובשליטה מוחלטת שלכם על לוח הזמנים.
          </p>

          <p className="about-text">
            <strong>לשוכרים – להגיע לחופשה בראש שקט.</strong>{' '}
            חוויית חיפוש קלה ומהירה של דירות נופש מובחרות. בלי לבזבז זמן יקר על סינונים
            מתישים, עם ביטחון מלא שהמקום שתקבלו יתאים בדיוק למה שחיפשתם.
          </p>

          <EditableText as="h3" id="about.block3.title" className="about-subheading">
            החזון שלנו
          </EditableText>

          <p className="about-text">
            אנו מאמינים שאירוח מושלם מתחיל בחיבור נכון ובפשטות תפעולית. המטרה שלנו היא
            לאפשר לבעלי נכסים ליהנות מהנכס שלהם גם כשהם לא נמצאים בו, ולהעניק לנופשים את
            החופשה הרגועה והמדויקת ביותר.
          </p>

          <p className="about-text">
            הנכם מוזמנים להצטרף לקהילה שלנו – בין אם כדי למצוא את המקום המושלם לשבת
            הקרובה, ובין אם כדי להתחיל להרוויח מהנכס שלכם כשהוא פנוי.
          </p>

          <p className="about-signature">צוות &quot;דירות נופש&quot;</p>
        </article>
      </section>
    </div>
  );
}

export default AboutPage;
