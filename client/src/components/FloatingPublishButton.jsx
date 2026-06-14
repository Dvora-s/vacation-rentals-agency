import { Link, useLocation } from 'react-router-dom';
import './styles/FloatingPublishButton.css';

// כפתור צף בפינה השמאלית-תחתונה. מוסתר אוטומטית בדף הפרסום עצמו
// וכאשר משתמש נמצא במסכי האדמין כדי שלא יסתיר תוכן.
const HIDE_ON = ['/list-apartment', '/login', '/register'];

function FloatingPublishButton() {
  const location = useLocation();
  if (HIDE_ON.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <Link to="/list-apartment" className="floating-publish" aria-label="פרסם נכס">
      <span className="floating-publish-icon" aria-hidden="true">
        +
      </span>
      <span className="floating-publish-label">פרסם נכס</span>
    </Link>
  );
}

export default FloatingPublishButton;
