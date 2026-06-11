import { useEffect, useState } from 'react';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import EditableText from '../components/EditableText';
import CategoriesShowcase from '../components/CategoriesShowcase';
import HowToFind from '../components/HowToFind';
import WhyListWithUs from '../components/WhyListWithUs';
import { getFeaturedApartments } from '../services/api';
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

  return (
    <div className="home-page">
      <section
        className="hero"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      >
        <div className="hero-overlay" />
        <div className="hero-content">
          <EditableText as="h1" id="home.hero.title" className="hero-title">
            דירות נופש: הדרך הפשוטה והנעימה לחופשה הבאה שלכם
          </EditableText>
          <EditableText as="p" id="home.hero.subtitle" className="hero-subtitle">
            כל המידע שאתם צריכים במקום אחד. בוחרים נכס, יוצרים קשר ישיר עם המארח, ויוצאים לחופשה.
          </EditableText>
          <SearchBar />
        </div>
      </section>

      <CategoriesShowcase />

      <section className="featured section-container">
        <EditableText as="h2" id="home.featured.title" className="section-title">
          נכסים מומלצים
        </EditableText>

        {loading && <p className="loading-text">טוען דירות...</p>}

        {!loading && (
          <div className="apartments-grid">
            {apartments.map((apartment) => (
              <ApartmentCard key={apartment.id} apartment={apartment} />
            ))}
          </div>
        )}
      </section>

      <HowToFind />

      <WhyListWithUs />
    </div>
  );
}

export default HomePage;
