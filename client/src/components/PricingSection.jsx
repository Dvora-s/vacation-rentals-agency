import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPricingCatalog } from '../services/api';
import EditableText from './EditableText';
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

function PricingPostButton({ children, variant = 'primary', className = '', plan = null }) {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const handleClick = () => {
    if (loading) return;
    const target = '/list-apartment';
    const options = plan ? { state: { plan } } : undefined;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: target, plan } });
      return;
    }
    navigate(target, options);
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
durationLabel,
  tier = 'standard',
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
          {(durationLabel || months) && (
            <span className="pricing-card-period">
              {durationLabel || `ל-${months} חודשי פרסום`}
            </span>
          )}
        </div>
      </div>

      <ul className="pricing-card-features">
        {features.map((feature, idx) => (
          <li key={`${title}-${idx}-${feature.slice(0, 20)}`}>
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <PricingPostButton
        variant={variant === 'premium' || variant === 'featured' ? 'accent' : 'primary'}
        plan={{ tier, months, title }}
      >
        בחירת מסלול
      </PricingPostButton>
    </article>
  );
}

const CATEGORY_LABELS = {
  hosts: {
    title: 'דירות, יחידות אירוח או צימרים',
    subtitle: 'מסלולים גמישים לבעלי דירות ויחידות אירוח קטנות',
    gridClass: 'pricing-grid--3',
  },
  hotels: {
    title: 'מלונות, מתחמי אירוח וקמפוסים',
    subtitle: 'חבילות פרימיום עם חשיפה מקסימלית בתוצאות החיפוש',
    gridClass: 'pricing-grid--2',
  },
};

const FALLBACK_HOSTS = [
  {
    title: 'חודש',
    price: '₪30.00',
    months: 1,
    tier: 'standard',
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
    tier: 'standard',
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
    tier: 'standard',
    features: [
      'קבלת הודעות מהאתר למייל',
      'המלצות ודירוג הדירה',
      'אזור אישי באתר',
      '12 חודשי פרסום',
      'ניתן לפרוס ל-12 תשלומים',
    ],
  },
];

const FALLBACK_HOTELS = [
  {
    title: 'פרסום לחודש',
    price: '₪80.00',
    months: 1,
    tier: 'premium',
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
    tier: 'premium',
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

function mapApiPlanToCard(plan) {
  const variant =
    plan.highlightType === 'popular' ? 'featured' : plan.highlightType === 'premium' ? 'premium' : 'default';
  return {
    key: `api-${plan.id}`,
    title: plan.name,
    price: plan.effectivePriceFormatted,
    originalPrice: plan.originalPriceFormatted || undefined,
    features: plan.features || [],
    badge: plan.badgeText || undefined,
    variant,
    months: plan.durationMonths,
    durationLabel: plan.durationLabel || undefined,
  };
}

function PricingSection() {
  const [dynamicGroups, setDynamicGroups] = useState(null);
  const [catalogError, setCatalogError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPricingCatalog();
        if (!cancelled) {
          setDynamicGroups(data.groups || []);
          setCatalogError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setDynamicGroups(null);
          setCatalogError(e.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hostsPlans =
    dynamicGroups?.find((g) => g.category === 'hosts')?.plans?.map(mapApiPlanToCard) || FALLBACK_HOSTS;
  const hotelsPlans =
    dynamicGroups?.find((g) => g.category === 'hotels')?.plans?.map(mapApiPlanToCard) || FALLBACK_HOTELS;

  return (
    <section className="pricing-section" aria-labelledby="pricing-heading">
      <div className="pricing-hero">
        <div className="pricing-hero-bg" aria-hidden="true" />
        <div className="pricing-hero-inner section-container">
          <header className="pricing-header">
            <EditableText as="span" id="pricing.eyebrow" className="pricing-eyebrow">
              מחירון פרסום
            </EditableText>
            <EditableText as="h1" id="pricing.title" domId="pricing-heading" className="pricing-title">
              אלה תוכניות המחירים שלנו – בחרו את המסלול המתאים לכם
            </EditableText>
            <EditableText as="p" id="pricing.subtitle" className="pricing-subtitle">
              פרסמו את הנכס שלכם וקבלו חשיפה לקהל המחפש מקום אירוח בצורה פשוטה ומהירה.
            </EditableText>
            <PricingPostButton variant="hero" className="pricing-header-cta">
              פרסם נכס עכשיו
            </PricingPostButton>
          </header>

          {catalogError && dynamicGroups === null && (
            <p className="pricing-catalog-note" role="status">
              מציגים מחירון ברירת מחדל (השרת: {catalogError})
            </p>
          )}

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
        </div>
      </div>

      <div className="pricing-section-inner section-container">
        {(['hosts', 'hotels']).map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          const plans = cat === 'hosts' ? hostsPlans : hotelsPlans;
          return (
            <div
              key={cat}
              className={cat === 'hotels' ? 'pricing-category pricing-category--premium' : 'pricing-category'}
            >
              <div className="pricing-category-head">
                <EditableText as="h2" id={`pricing.category.${cat}.title`} className="pricing-category-title">
                  {meta.title}
                </EditableText>
                <EditableText as="p" id={`pricing.category.${cat}.desc`} className="pricing-category-desc">
                  {meta.subtitle}
                </EditableText>
              </div>
              <div className={`pricing-grid ${meta.gridClass}`}>
                {plans.map((plan) => (
                  <PricingCard key={plan.key || plan.title} {...plan} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PricingSection;