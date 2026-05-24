import { Link } from 'react-router-dom';
import './NotFoundPage.css';

function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>העמוד שחיפשת לא נמצא</p>
      <Link to="/" className="home-link">חזרה לדף הבית</Link>
    </div>
  );
}

export default NotFoundPage;
