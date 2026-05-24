import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import { getApartments } from '../services/api';
import './ApartmentsPage.css';

function ApartmentsPage() {
  const [searchParams] = useSearchParams();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');

  useEffect(() => {
    getApartments()
      .then(setApartments)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const loc = searchParams.get('location');
    if (loc) setLocationFilter(loc);
  }, [searchParams]);

  const locations = [...new Set(apartments.map((a) => a.location))];

  const filtered = locationFilter
    ? apartments.filter((a) => a.location.includes(locationFilter))
    : apartments;

  return (
    <div className="apartments-page">
      <section className="apartments-hero">
        <h1>חיפוש דירה</h1>
        <p>מצאו את דירת הנופש המושלמת עבורכם</p>
        <SearchBar />
      </section>

      <section className="section-container apartments-content">
        <div className="filters">
          <label htmlFor="location-filter">סינון לפי מיקום:</label>
          <select
            id="location-filter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">הכל</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="loading-text">טוען דירות...</p>}

        {!loading && filtered.length === 0 && (
          <p className="empty-text">לא נמצאו דירות במיקום זה</p>
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
