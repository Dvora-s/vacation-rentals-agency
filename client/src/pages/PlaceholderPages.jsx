import './PlaceholderPage.css';

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
  return (
    <PlaceholderPage
      title="מחירון"
      description="כאן יוצגו חבילות פרסום לבעלי נכסים ומידע על עמלות השירות."
    />
  );
}

export function FaqPage() {
  return (
    <PlaceholderPage
      title="שאלות נפוצות"
      description="תשובות לשאלות נפוצות על הזמנת דירות, ביטולים ופרסום נכס."
    />
  );
}

export function ContactPage() {
  return (
    <PlaceholderPage
      title="צור קשר"
      description="פרטי התקשרות, טופס פנייה ופרסום נכס — בקרוב."
    />
  );
}
