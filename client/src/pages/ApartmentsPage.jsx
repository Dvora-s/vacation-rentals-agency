import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import { getApartments } from '../services/api';
import { apartmentMatchesCategory, findCategory } from '../data/categories';
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

  const filtered = useMemo(() => {
    return apartments.filter((a) => {
      const okCat = apartmentMatchesCategory(a, categoryFilter);
      const okLoc = locationFilter ? a.location.includes(locationFilter) : true;
      return okCat && okLoc;
    });
  }, [apartments, categoryFilter, locationFilter]);

  function setCategory(catId) {
    const next = new URLSearchParams(searchParams);
    if (catId) next.set('category', catId);
    else next.delete('category');
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
        <CategoryFilter value={categoryFilter} onChange={setCategory} />

        {locationFilter && (
          <p className="active-location">
            מציג דירות באזור: <strong>{locationFilter}</strong>
            <button
              type="button"
              className="filter-clear"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('location');
                setSearchParams(next, { replace: true });
              }}
            >
              נקה
            </button>
          </p>
        )}

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
