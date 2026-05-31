import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import './QuickCategoryGrid.css';

function QuickCategoryGrid() {
  return (
    <section className="quick-cats section-container">
      <h2 className="quick-cats-title">קטגוריות חיפוש מהיר</h2>
      <div className="quick-cats-grid">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            to={`/apartments?category=${cat.id}`}
            className="quick-cat-card"
          >
            <span className="quick-cat-icon" aria-hidden="true">
              {cat.icon}
            </span>
            <span className="quick-cat-label">{cat.short}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default QuickCategoryGrid;
