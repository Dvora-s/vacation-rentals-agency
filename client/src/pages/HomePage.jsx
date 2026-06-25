import { useEffect, useState } from 'react';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import CategoriesShowcase from '../components/CategoriesShowcase';
import HowToFind from '../components/HowToFind';
import { getFeaturedApartments } from '../services/api';
import '../components/styles/PageHero.css';
import './HomePage.css';

const HERO_IMAGE = '/hero.png';

function HomePage() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedApartments(4)
      .then(setApartments)
      .finally(() => setLoading(false));
  }, []);

  function handleApartmentImageUpdate(updated) {
    if (!updated?.id) return;
    setApartments((prev) =>
      prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)),
    );
  }

  return (
    <div className="home-page">
      <EditableImage
        id="home.hero"
        src={HERO_IMAGE}
        mode="background"
        as="section"
        className="page-hero hero"
      >
        <div className="page-hero-overlay" />
        <div className="page-hero-inner hero-content">
          <EditableText as="h1" id="home.hero.title" className="page-hero-title hero-title">
            דירות נופש: הדרך הפשוטה והנעימה לחופשה הבאה שלכם
          </EditableText>
          <EditableText as="p" id="home.hero.subtitle" className="page-hero-subtitle hero-subtitle">
            כל המידע שאתם צריכים במקום אחד. בוחרים נכס, יוצרים קשר ישיר עם המארח, ויוצאים לחופשה.
          </EditableText>
          <SearchBar variant="inline" />
        </div>
      </EditableImage>

      <CategoriesShowcase />

      <section className="featured section-container">
        <EditableText as="h2" id="home.featured.title" className="section-title">
          נכסים מומלצים
        </EditableText>

        {loading && <p className="loading-text">טוען דירות...</p>}

        {!loading && (
          <div className="apartments-grid">
            {apartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                onApartmentUpdate={handleApartmentImageUpdate}
              />
            ))}
          </div>
        )}
      </section>

      <HowToFind />
    </div>
  );
}

export default HomePage;
