import { NavLink } from 'react-router-dom';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'בית', end: true },
  { to: '/apartments', label: 'חיפוש דירה' },
  { to: '/about', label: 'אודות' },
  { to: '/pricing', label: 'מחירון' },
  { to: '/faq', label: 'שאלות נפוצות' },
  { to: '/contact', label: 'צור קשר' },
];

function Navbar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-logo">
        <img src="/logo.png" alt="דירות נופש" />
      </NavLink>

      <nav className="navbar-nav">
        <ul className="navbar-links">
          {navLinks.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <NavLink to="/contact" className="navbar-cta btn-outline-gold">
        פרסם נכס
      </NavLink>
    </header>
  );
}

export default Navbar;
