import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEARCH_CATEGORIES } from '../data/categories';
import { CITY_NAMES, REGIONS } from '../data/locations';
import { useRegionResolver } from '../hooks/useRegionResolver';
import Combobox from './Combobox';
import './SearchBar.css';

function SearchBar({ initialCategory = '', initialLocation = '', initialRegion = '' }) {
  const navigate = useNavigate();
  const resolver = useRegionResolver();
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);
  const [region, setRegion] = useState(initialRegion);

  // כשנבחר אזור — מציגים בחיפוש רק את הערים השייכות לאותו אזור (לפי המאגר הממשלתי).
  const cityOptions = useMemo(
    () => (region ? resolver.citiesForRegion(region) : CITY_NAMES),
    [region, resolver],
  );

  // החלפת אזור מאפסת עיר שאינה שייכת לאזור החדש.
  function handleRegionChange(nextRegion) {
    setRegion(nextRegion);
    if (nextRegion && location && !resolver.citiesForRegion(nextRegion).includes(location)) {
      setLocation('');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (region) params.set('region', region);
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
          <span className="field-icon">🧭</span>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value)}
            aria-label="אזור"
          >
            <option value="">כל האזורים</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
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
            placeholder={region ? 'בחרו עיר באזור' : 'בחרו עיר'}
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
