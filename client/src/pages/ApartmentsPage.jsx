import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import RangeSlider from '../components/RangeSlider';
import { getApartments } from '../services/api';
import {
  apartmentMatchesCategory,
  findCategory,
  HOMEPAGE_CATEGORIES,
} from '../data/categories';
import { apartmentMatchesRegion, REGIONS } from '../data/locations';
import { useRegionResolver } from '../hooks/useRegionResolver';
import '../components/PageHero.css';
import './ApartmentsPage.css';

const PRICE_LIMITS = { min: 0, max: 20000 };
const GUEST_LIMITS = { min: 0, max: 50 };
const ROOM_LIMITS = { min: 0, max: 20 };

const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;
const MOBILE_QUERY = '(max-width: 640px)';

function getInitialPageSize() {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches) {
    return MOBILE_PAGE_SIZE;
  }
  return DESKTOP_PAGE_SIZE;
}

function ApartmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resolver = useRegionResolver();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [priceRange, setPriceRange] = useState(PRICE_LIMITS);
  const [guestRange, setGuestRange] = useState(GUEST_LIMITS);
  const [roomRange, setRoomRange] = useState(ROOM_LIMITS);

  const [pageSize, setPageSize] = useState(getInitialPageSize);
  const [visibleCount, setVisibleCount] = useState(getInitialPageSize);
  const sentinelRef = useRef(null);

  const categoryFilter = searchParams.get('category') || '';
  const locationFilter = searchParams.get('location') || '';
  const regionFilter = searchParams.get('region') || '';

  useEffect(() => {
    getApartments()
      .then(setApartments)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setPageSize(mql.matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  const filtered = useMemo(() => {
    return apartments.filter((a) => {
      const okCat = apartmentMatchesCategory(a, categoryFilter);
      const okLoc = locationFilter ? a.location.includes(locationFilter) : true;
      const okRegion = apartmentMatchesRegion(a.location, regionFilter, resolver);
      const price = Number(a.price_per_night) || 0;
      const guests = Number(a.max_guests) || 0;
      const rooms = Number(a.bedrooms) || 0;
      const okPrice = price >= priceRange.min && price <= priceRange.max;
      const okGuests = guests >= guestRange.min && guests <= guestRange.max;
      const okRooms = rooms >= roomRange.min && rooms <= roomRange.max;
      return okCat && okLoc && okRegion && okPrice && okGuests && okRooms;
    });
  }, [apartments, categoryFilter, locationFilter, regionFilter, priceRange, guestRange, roomRange, resolver]);

  const visibleApartments = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, filtered]);

  useEffect(() => {
    if (!hasMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => current + pageSize);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, pageSize, visibleCount]);

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
  const homeCategory = HOMEPAGE_CATEGORIES.find((c) => c.id === categoryFilter);
  const defaultHero = homeCategory?.image || activeCategory?.image || '/hero.png';
  const heroImageKey = categoryFilter
    ? `apartments.hero.${categoryFilter}`
    : 'apartments.hero.default';
  const heroTitle = homeCategory?.title || activeCategory?.label || 'מצא דירה';

  function handleApartmentImageUpdate(updated) {
    if (!updated?.id) return;
    setApartments((prev) =>
      prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)),
    );
  }

  return (
    <div className="apartments-page">
      <EditableImage
        id={heroImageKey}
        src={defaultHero}
        mode="background"
        as="section"
        className="page-hero apartments-hero"
      >
        <div className="page-hero-overlay" />
        <div className="page-hero-inner apartments-hero-inner">
          <EditableText
            as="h1"
            id={categoryFilter ? `apartments.hero.title.${categoryFilter}` : 'apartments.hero.title'}
            className="page-hero-title"
          >
            {heroTitle}
          </EditableText>
          <p className="page-hero-subtitle">
            {activeCategory
              ? `מצאו את דירת הנופש המושלמת לקטגוריית ${activeCategory.label}`
              : 'מצאו את דירת הנופש המושלמת עבורכם'}
          </p>
          <SearchBar
            initialCategory={categoryFilter}
            initialLocation={locationFilter}
            initialRegion={regionFilter}
          />
        </div>
      </EditableImage>

      <section className="section-container apartments-content">
        <div className="apartments-shell">
          <aside className="filters-sidebar">
            <div className="filters-head">
              <EditableText as="h2" id="apartments.filters.title" className="filters-title">
                סינון
              </EditableText>
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
            {regionFilter && (
              <p className="active-location">
                אזור:{' '}
                <strong>
                  {REGIONS.find((r) => r.id === regionFilter)?.label || regionFilter}
                </strong>
                <button
                  type="button"
                  className="filter-clear"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('region');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  נקה
                </button>
              </p>
            )}

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
              <>
                <div className="apartments-grid">
                  {visibleApartments.map((apartment) => (
                    <ApartmentCard
                      key={apartment.id}
                      apartment={apartment}
                      onApartmentUpdate={handleApartmentImageUpdate}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div ref={sentinelRef} className="apartments-sentinel">
                    <span className="apartments-spinner" aria-hidden="true" />
                    <span>טוען עוד דירות...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ApartmentsPage;
