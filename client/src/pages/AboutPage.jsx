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
            כשאתם מחפשים מקום להתארח בו, או שוקלים להשכיר את הנכס שלכם, אתם לא מחפשים עוד לוח
            מודעות מתיש. אתם מחפשים שקט נפשי, דיוק וחיסכון בזמן.
          </EditableText>

          <EditableText as="p" id="about.block1.mission" className="about-text">
            אתר &quot;דירות נופש&quot; הוקם כדי לקחת את המורכבות של עולם האירוח, ולהפוך אותה
            לפלטפורמה חכמה שעובדת בשבילכם.
          </EditableText>

          <EditableText as="h3" id="about.block2.title" className="about-subheading">
            מה הערך שלכם כאן?
          </EditableText>

          <EditableText as="h4" id="about.block2.renters.title" className="about-subheading about-subheading--minor">
            🎯 לשוכרים (מחפשי הדירות):
          </EditableText>

          <p className="about-text">
            <strong>מינימום מאמץ, מקסימום התאמה:</strong> במקום לבזבז שעות בקבוצות או
            בטלפונים, אתם מקבלים פלטפורמה נגישה שמוצאת עבורכם את הדירה המדויקת לשבת, לחופשה
            או לאירוע – בדיוק לפי הצרכים שלכם.
          </p>

          <p className="about-text">
            <strong>איכות שמקצרת תהליכים:</strong> גישה ישירה לנכסים נבחרים שעונים על הסטנדרט
            שלכם, בלי הפתעות.
          </p>

          <EditableText as="h4" id="about.block2.landlords.title" className="about-subheading about-subheading--minor">
            💰 למשכירים (בעלי הנכסים):
          </EditableText>

          <p className="about-text">
            <strong>הכנסה חכמה מהצד:</strong> הבתים שלנו עומדים לעיתים ריקים בסופי שבוע
            ובחגים. במקום לפספס את ההזדמנות, האתר מאפשר לכם לתת לנכס לעבוד עבורכם ולייצר הכנסה
            נוספת.
          </p>

          <p className="about-text">
            <strong>במה מקצועית לפניות ישירות:</strong> פלטפורמה חכמה לחשיפת הנכס שלכם, שמביאה
            אליכם פניות ממוקדות של שוכרים רלוונטיים ומאפשרת לכם לסגור מולם ישירות בראש שקט
            ובפשטות מלאה.
          </p>

          <EditableText as="h3" id="about.block3.title" className="about-subheading">
            הערך המוסף שלנו: החיבור הנכון
          </EditableText>

          <EditableText as="p" id="about.block3.body" className="about-text">
            אנו מאמינים שאירוח טוב מתחיל בחיבור נכון ובירידה לפרטים הקטנים ביותר. האתר הזה נבנה
            מתוך הבנה עמוקה של שני הצדדים: הפשטות והיעילות שדרושה לכם כבעלי נכסים, מול הנוחות
            והדיוק שחשובים לכם כשוכרים.
          </EditableText>

          <EditableText as="p" id="about.block3.cta" className="about-text about-text--cta">
            הצטרפו לקהילה שלנו עוד היום – והתחילו ליהנות מאירוח חכם, פשוט ומשתלם.
          </EditableText>
        </article>
      </section>
    </div>
  );
}

export default AboutPage;
