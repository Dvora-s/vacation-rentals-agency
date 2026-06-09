import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsers } from '../services/api';
import './AdminUsersPage.css';

const ROLE_LABELS = {
  admin: 'מנהל',
  owner: 'בעל נכס',
  user: 'משתמש',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL');
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getUsers();
        if (active) setUsers(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-users-page section-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">משתמשים רשומים</h1>
          <p className="page-subtitle">רשימת כל המשתמשים וכתובות המייל שלהם</p>
        </div>
        <Link to="/admin" className="my-apt-link">
          לאישורי דירות
        </Link>
      </div>

      {loading && <p className="loading-text">טוען...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && !error && users.length === 0 && (
        <div className="empty-state">
          <p>אין עדיין משתמשים רשומים</p>
        </div>
      )}

      {users.length > 0 && (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>שם מלא</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th>תפקיד</th>
                <th>תאריך הרשמה</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>{u.full_name}</td>
                  <td>
                    <a href={`mailto:${u.email}`}>{u.email}</a>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
