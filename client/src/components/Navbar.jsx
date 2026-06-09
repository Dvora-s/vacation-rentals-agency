import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'בלוג דירות נופש', highlight: true, end: true },
  { to: '/apartments', label: 'מצא דירה' },
  { to: '/about', label: 'אודות' },
  { to: '/pricing', label: 'מחירון פרסום' },
  { to: '/faq', label: 'שאלות נפוצות' },
  { to: '/contact', label: 'צור קשר' },
];

function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-logo">
        <img src="/logo.svg" alt="דירות נופש" />
      </NavLink>

      <nav className="navbar-nav">
        <ul className="navbar-links">
          {navLinks.map(({ to, label, highlight, end }) => (
            <li key={label}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'nav-link',
                    isActive ? 'active' : '',
                    highlight ? 'nav-link-highlight' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
          {isAuthenticated && (
            <li>
              <NavLink
                to="/my-apartments"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                הדירות שלי
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                ניהול
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                משתמשים
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <div className="navbar-user">
            <span className="navbar-user-name" title={user?.email}>
              שלום, {user?.full_name?.split(' ')[0] || user?.email}
            </span>
            <button type="button" className="navbar-logout" onClick={handleLogout}>
              התנתקות
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="nav-link nav-link-login">
            <span className="nav-link-login-icon">+</span> התחבר
          </NavLink>
        )}

        <NavLink to="/list-apartment" className="navbar-cta btn-outline-gold">
          פרסם נכס
        </NavLink>
      </div>
    </header>
  );
}

export default Navbar;
