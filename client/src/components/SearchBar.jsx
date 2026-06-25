import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEARCH_CATEGORIES } from '../data/categories';
import { CITY_NAMES } from '../data/locations';
import { useRegionResolver } from '../hooks/useRegionResolver';
import Combobox from './Combobox';
import './styles/SearchBar.css';

function SearchBar({ initialCategory = '', initialLocation = '', initialRegion = '', variant = 'hero' }) {
  const navigate = useNavigate();
  const resolver = useRegionResolver();
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);
  const [region] = useState(initialRegion);

  useEffect(() => {
    setCategory(initialCategory);
    setLocation(initialLocation);
  }, [initialCategory, initialLocation]);

  const cityOptions = useMemo(
    () => (region ? resolver.citiesForRegion(region) : CITY_NAMES),
    [region, resolver],
  );

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (region) params.set('region', region);
    if (location) params.set('location', location);
    navigate(`/apartments?${params.toString()}`);
  }

  const isInline = variant === 'inline';

  if (isInline) {
    return (
      <form className="search-bar search-bar--inline" onSubmit={handleSearch}>
        <div className="search-inline-fields">
          <div className="search-inline-field search-inline-field--location">
            <Combobox
              className="search-combobox"
              value={location}
              onChange={setLocation}
              options={cityOptions}
              placeholder="הקלד שם עיר ו/או שכונה..."
              emptyText="לא נמצאה עיר תואמת"
            />
          </div>
          <div className="search-inline-divider" aria-hidden="true" />
          <div className="search-inline-field search-inline-field--category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="קטגוריה"
            >
              <option value="">...בחר קטגוריה</option>
              {SEARCH_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="search-inline-submit" aria-label="חיפוש">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </form>
    );
  }

  return (
    <form className="search-bar search-bar--card" onSubmit={handleSearch}>
      <p className="search-label">חיפוש מהיר</p>
      <div className="search-fields">
        <div className="search-field">
          <span className="field-icon">🏷️</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="קטגוריה"
          >
            <option value="">בחרו קטגוריה</option>
            {SEARCH_CATEGORIES.map((c) => (
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
            options={cityOptions}
            placeholder="בחרו עיר"
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
