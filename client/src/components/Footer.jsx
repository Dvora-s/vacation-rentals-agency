import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo">
          <img src="/logo.png" alt="דירות נופש" />
        </Link>
        <p className="footer-copy">© {new Date().getFullYear()} דירות נופש — כל הזכויות שמורות</p>
      </div>
    </footer>
  );
}

export default Footer;
