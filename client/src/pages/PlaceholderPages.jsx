import './PlaceholderPage.css';
import PricingSection from '../components/PricingSection';

function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page section-container">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="placeholder-note">עמוד זה יושלם בשלבים הבאים של הפרויקט.</p>
    </div>
  );
}

export function PricingPage() {
  return <PricingSection />;
}

export function FaqPage() {
  return (
    <PlaceholderPage
      title="שאלות נפוצות"
      description="תשובות לשאלות נפוצות על הזמנת דירות, ביטולים ופרסום נכס."
    />
  );
}

export function BlogPage() {
  return (
    <PlaceholderPage
      title="בלוג דירות לשבת"
      description="טיפים, מדריכים והמלצות לדירות נופש לשבת — בקרוב."
    />
  );
}
