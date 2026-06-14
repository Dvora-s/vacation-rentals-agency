import { Link } from 'react-router-dom';
import EditableImage from './EditableImage';
import './styles/Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo">
          <EditableImage id="site.brand-logo" src="/brand-logo.png" alt="דירות נופש" />
        </Link>
        <nav className="footer-legal" aria-label="מסמכים משפטיים">
          <Link to="/privacy" className="footer-legal-link">מדיניות פרטיות</Link>
          <span className="footer-legal-sep" aria-hidden="true">|</span>
          <Link to="/terms" className="footer-legal-link">תנאי השימוש</Link>
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} דירות נופש — כל הזכויות שמורות</p>
      </div>
    </footer>
  );
}

export default Footer;
