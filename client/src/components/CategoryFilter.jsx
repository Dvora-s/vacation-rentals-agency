import { CATEGORIES } from '../data/categories';
import './CategoryFilter.css';

function CategoryFilter({ value, onChange }) {
  return (
    <div className="category-filter">
      <button
        type="button"
        className={`cat-chip ${!value ? 'active' : ''}`}
        onClick={() => onChange('')}
      >
        <span className="cat-chip-icon">🏠</span>
        <span className="cat-chip-label">הכל</span>
      </button>

      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`cat-chip ${value === cat.id ? 'active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          <span className="cat-chip-icon">{cat.icon}</span>
          <span className="cat-chip-label">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;
