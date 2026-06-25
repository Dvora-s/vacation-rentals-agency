import { Link } from 'react-router-dom';
import SiteLogo from './SiteLogo';
import './styles/Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo">
          <SiteLogo />
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
