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

export function BlogPage() {
  return (
    <PlaceholderPage
      title="בלוג דירות נופש"
      description="טיפים, מדריכים והמלצות לדירות נופש לשבת — בקרוב."
    />
  );
}
