import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import './CategoriesShowcase.css';

// 4 הקטגוריות הראשיות שמופיעות ב"הקטגוריות שלנו" — בכרטיסים גדולים עם תמונה.
const MAIN_IDS = ['bein-hazmanim', 'shabbat', 'holidays', 'pesach'];

function CategoriesShowcase() {
  const items = MAIN_IDS
    .map((id) => CATEGORIES.find((c) => c.id === id))
    .filter(Boolean);

  return (
    <section className="categories-showcase section-container">
      <div className="categories-showcase-head">
        <span className="categories-divider" />
        <h2 className="categories-title">הקטגוריות שלנו</h2>
      </div>
      <p className="categories-subtitle">מצא את הנכס המתאים לכל זמן ובכל גודל.</p>

      <div className="categories-showcase-grid">
        {items.map((cat) => (
          <Link
            key={cat.id}
            to={`/apartments?category=${cat.id}`}
            className="category-showcase-card"
            style={{ backgroundImage: `url(${cat.image})` }}
          >
            <div className="category-showcase-overlay" />
            <div className="category-showcase-content">
              <h3>{cat.label}</h3>
              <p>{cat.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default CategoriesShowcase;
