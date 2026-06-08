import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import RangeSlider from '../components/RangeSlider';
import { getApartments } from '../services/api';
import { apartmentMatchesCategory, findCategory } from '../data/categories';
import './ApartmentsPage.css';

const PRICE_LIMITS = { min: 0, max: 20000 };
const GUEST_LIMITS = { min: 0, max: 50 };
const ROOM_LIMITS = { min: 0, max: 20 };

function ApartmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [priceRange, setPriceRange] = useState(PRICE_LIMITS);
  const [guestRange, setGuestRange] = useState(GUEST_LIMITS);
  const [roomRange, setRoomRange] = useState(ROOM_LIMITS);

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
      const price = Number(a.price_per_night) || 0;
      const guests = Number(a.max_guests) || 0;
      const rooms = Number(a.bedrooms) || 0;
      const okPrice = price >= priceRange.min && price <= priceRange.max;
      const okGuests = guests >= guestRange.min && guests <= guestRange.max;
      const okRooms = rooms >= roomRange.min && rooms <= roomRange.max;
      return okCat && okLoc && okPrice && okGuests && okRooms;
    });
  }, [apartments, categoryFilter, locationFilter, priceRange, guestRange, roomRange]);

  function setCategory(catId) {
    const next = new URLSearchParams(searchParams);
    if (catId) next.set('category', catId);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  }

  function resetRanges() {
    setPriceRange(PRICE_LIMITS);
    setGuestRange(GUEST_LIMITS);
    setRoomRange(ROOM_LIMITS);
  }

  const rangesActive =
    priceRange.min !== PRICE_LIMITS.min ||
    priceRange.max !== PRICE_LIMITS.max ||
    guestRange.min !== GUEST_LIMITS.min ||
    guestRange.max !== GUEST_LIMITS.max ||
    roomRange.min !== ROOM_LIMITS.min ||
    roomRange.max !== ROOM_LIMITS.max;

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

        <div className="apartments-shell">
          <aside className="filters-sidebar">
            <div className="filters-head">
              <h2 className="filters-title">סינון</h2>
              {rangesActive && (
                <button type="button" className="filters-reset" onClick={resetRanges}>
                  איפוס
                </button>
              )}
            </div>

            <RangeSlider
              label="טווח מחירים ללילה"
              min={PRICE_LIMITS.min}
              max={PRICE_LIMITS.max}
              step={100}
              value={priceRange}
              onChange={setPriceRange}
              format={(v) => `₪${v.toLocaleString('he-IL')}`}
            />

            <RangeSlider
              label="מספר נפשות"
              min={GUEST_LIMITS.min}
              max={GUEST_LIMITS.max}
              step={1}
              value={guestRange}
              onChange={setGuestRange}
              format={(v) => `${v}`}
            />

            <RangeSlider
              label="מספר חדרים"
              min={ROOM_LIMITS.min}
              max={ROOM_LIMITS.max}
              step={1}
              value={roomRange}
              onChange={setRoomRange}
              format={(v) => `${v}`}
            />
          </aside>

          <div className="apartments-main">
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
          </div>
        </div>
      </section>
    </div>
  );
}

export default ApartmentsPage;
