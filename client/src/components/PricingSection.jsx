import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PricingSection.css';

function CheckIcon() {
  return (
    <svg className="pricing-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" className="pricing-check-bg" />
      <path
        d="M6 10.2l2.4 2.4L14 7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingPostButton({ children, variant = 'primary', className = '' }) {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const handleClick = () => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/list-apartment' } });
      return;
    }
    navigate('/list-apartment');
  };

  return (
    <button
      type="button"
      className={`pricing-btn pricing-btn--${variant} ${className}`.trim()}
      onClick={handleClick}
      disabled={loading}
    >
      {children}
    </button>
  );
}

function PricingCard({
  title,
  price,
  originalPrice,
  features,
  badge,
  variant = 'default',
  months,
}) {
  return (
    <article className={`pricing-card pricing-card--${variant}`}>
      {badge && <span className="pricing-card-badge">{badge}</span>}

      <div className="pricing-card-header">
        <h4 className="pricing-card-title">{title}</h4>
        <div className="pricing-card-price-wrap">
          {originalPrice && (
            <span className="pricing-card-price-old" aria-label={`מחיר מקורי ${originalPrice}`}>
              {originalPrice}
            </span>
          )}
          <span className="pricing-card-price">{price}</span>
          {months && <span className="pricing-card-period">ל-{months} חודשי פרסום</span>}
        </div>
      </div>

      <ul className="pricing-card-features">
        {features.map((feature) => (
          <li key={feature}>
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <PricingPostButton variant={variant === 'premium' || variant === 'featured' ? 'accent' : 'primary'}>
        בחירת מסלול
      </PricingPostButton>
    </article>
  );
}

const CATEGORY_ONE = [
  {
    title: 'חודש',
    price: '₪30.00',
    months: 1,
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג הדירה',
      'אזור אישי באתר',
      'חודש פרסום אחד',
    ],
  },
  {
    title: '2 חודשים',
    price: '₪60.00',
    months: 2,
    badge: 'הכי פופולרי',
    variant: 'featured',
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג הדירה',
      'אזור אישי באתר',
      '2 חודשי פרסום',
    ],
  },
  {
    title: '12 חודשים',
    price: '₪330.00',
    months: 12,
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג הדירה',
      'אזור אישי באתר',
      '12 חודשי פרסום',
      'ניתן לפרוס ל-12 תשלומים',
    ],
  },
];

const CATEGORY_TWO = [
  {
    title: 'פרסום לחודש',
    price: '₪80.00',
    months: 1,
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג',
      'תמיד בראש התוצאות',
      'אזור אישי באתר',
      'חודש פרסום',
      'פריסה לתשלומים',
    ],
  },
  {
    title: 'פרסום לשנה',
    price: '₪550.00',
    originalPrice: '₪800.00',
    months: 12,
    badge: 'חיסכון משמעותי',
    variant: 'premium',
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג',
      'תמיד בראש התוצאות',
      'אזור אישי באתר',
      '12 חודשי פרסום',
      'ניתן לפרוס ל-12 תשלומים',
    ],
  },
];

const TRUST_ITEMS = [
  { icon: '🔒', label: 'תשלום מאובטח' },
  { icon: '⚡', label: 'פרסום מהיר' },
  { icon: '✓', label: 'ללא עמלות נסתרות' },
];

function PricingSection() {
  return (
    <section className="pricing-section" aria-labelledby="pricing-heading">
      <div className="pricing-section-bg" aria-hidden="true" />

      <div className="pricing-section-inner section-container">
        <header className="pricing-header">
          <span className="pricing-eyebrow">מחירון פרסום</span>
          <h1 id="pricing-heading" className="pricing-title">
            אלה תוכניות המחירים שלנו – בחרו את המסלול המתאים לכם
          </h1>
          <p className="pricing-subtitle">
            פרסמו את הנכס שלכם וקבלו חשיפה לקהל המחפש מקום אירוח בצורה פשוטה ומהירה.
          </p>
          <PricingPostButton variant="hero" className="pricing-header-cta">
            פרסם נכס עכשיו
          </PricingPostButton>
        </header>

        <ul className="pricing-trust" aria-label="יתרונות השירות">
          {TRUST_ITEMS.map(({ icon, label }) => (
            <li key={label}>
              <span className="pricing-trust-icon" aria-hidden="true">
                {icon}
              </span>
              {label}
            </li>
          ))}
        </ul>

        <div className="pricing-category">
          <div className="pricing-category-head">
            <h2 className="pricing-category-title">דירות, יחידות אירוח או צימרים</h2>
            <p className="pricing-category-desc">מסלולים גמישים לבעלי דירות ויחידות אירוח קטנות</p>
          </div>
          <div className="pricing-grid pricing-grid--3">
            {CATEGORY_ONE.map((plan) => (
              <PricingCard key={plan.title} {...plan} />
            ))}
          </div>
        </div>

        <div className="pricing-category pricing-category--premium">
          <div className="pricing-category-head">
            <h2 className="pricing-category-title">מלונות, מתחמי אירוח וקמפוסים</h2>
            <p className="pricing-category-desc">חבילות פרימיום עם חשיפה מקסימלית בתוצאות החיפוש</p>
          </div>
          <div className="pricing-grid pricing-grid--2">
            {CATEGORY_TWO.map((plan) => (
              <PricingCard key={plan.title} {...plan} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
