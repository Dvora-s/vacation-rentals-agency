import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { CITY_NAMES } from '../data/locations';
import Combobox from './Combobox';
import './SearchBar.css';

function SearchBar({ initialCategory = '', initialLocation = '' }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    navigate(`/apartments?${params.toString()}`);
  }

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <p className="search-label">חיפוש מהיר</p>
      <div className="search-fields">
        <div className="search-field">
          <span className="field-icon">🏷️</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="קטגוריה"
          >
            <option value="">בחרי קטגוריה</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="search-divider" />
        <div className="search-field">
          <span className="field-icon">📍</span>
          <Combobox
            className="search-combobox"
            value={location}
            onChange={setLocation}
            options={CITY_NAMES}
            placeholder="בחרי עיר"
            emptyText="לא נמצאה עיר תואמת"
          />
        </div>
        <button type="submit" className="search-btn btn-primary">
          חיפוש
        </button>
      </div>
      <p className="search-note">
        ⓘ בלי תאריכים — תאמי ישירות עם בעל הדירה את הזמינות.
      </p>
    </form>
  );
}

export default SearchBar;
