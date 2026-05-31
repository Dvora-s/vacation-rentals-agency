import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import { getApartments } from '../services/api';
import { CATEGORIES, apartmentMatchesCategory, findCategory } from '../data/categories';
import './ApartmentsPage.css';

function ApartmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryFilter = searchParams.get('category') || '';
  const locationFilter = searchParams.get('location') || '';

  useEffect(() => {
    getApartments()
      .then(setApartments)
      .finally(() => setLoading(false));
  }, []);

  const locations = useMemo(
    () => [...new Set(apartments.map((a) => a.location))],
    [apartments],
  );

  const filtered = useMemo(() => {
    return apartments.filter((a) => {
      const okCat = apartmentMatchesCategory(a, categoryFilter);
      const okLoc = locationFilter ? a.location.includes(locationFilter) : true;
      return okCat && okLoc;
    });
  }, [apartments, categoryFilter, locationFilter]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const activeCategory = findCategory(categoryFilter);

  return (
    <div className="apartments-page">
      <section className="apartments-hero">
        <h1>מצא דירה</h1>
        <p>
          {activeCategory
            ? `קטגוריה נבחרת: ${activeCategory.label}`
            : 'מצאו את דירת הנופש המושלמת עבורכם'}
        </p>
        <SearchBar initialCategory={categoryFilter} initialLocation={locationFilter} />
      </section>

      <section className="section-container apartments-content">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="cat-filter">קטגוריה:</label>
            <select
              id="cat-filter"
              value={categoryFilter}
              onChange={(e) => updateParam('category', e.target.value)}
            >
              <option value="">הכל</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="location-filter">מיקום:</label>
            <select
              id="location-filter"
              value={locationFilter}
              onChange={(e) => updateParam('location', e.target.value)}
            >
              <option value="">הכל</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {(categoryFilter || locationFilter) && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => setSearchParams({}, { replace: true })}
            >
              נקה סינון
            </button>
          )}
        </div>

        {loading && <p className="loading-text">טוען דירות...</p>}

        {!loading && filtered.length === 0 && (
          <p className="empty-text">לא נמצאו דירות התואמות את החיפוש</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="apartments-grid">
            {filtered.map((apartment) => (
              <ApartmentCard key={apartment.id} apartment={apartment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ApartmentsPage;
