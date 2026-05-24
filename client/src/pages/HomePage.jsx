import { useEffect, useState } from 'react';
import ApartmentCard from '../components/ApartmentCard';
import SearchBar from '../components/SearchBar';
import { getFeaturedApartments } from '../services/api';
import './HomePage.css';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80';

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
          <h1 className="hero-title">חופשת החלומות שלכם מחכה</h1>
          <SearchBar />
        </div>
      </section>

      <section className="featured section-container">
        <h2 className="section-title">נכסים מומלצים</h2>

        {loading && <p className="loading-text">טוען דירות...</p>}

        {!loading && (
          <div className="apartments-grid">
            {apartments.map((apartment) => (
              <ApartmentCard key={apartment.id} apartment={apartment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
