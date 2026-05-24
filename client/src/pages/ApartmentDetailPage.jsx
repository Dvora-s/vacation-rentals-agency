import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApartmentById } from '../services/api';
import './ApartmentDetailPage.css';

const DEFAULT_AMENITIES = [
  { icon: '❄️', label: 'מיזוג אוויר' },
  { icon: '📶', label: 'אינטרנט מהיר' },
  { icon: '🅿️', label: 'חניה שמורה' },
  { icon: '🌅', label: 'מרפסת פרטית' },
  { icon: '🍳', label: 'מטבח מאובזר' },
];

function ApartmentDetailPage() {
  const { id } = useParams();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getApartmentById(id)
      .then((data) => {
        setApartment(data);
        setActiveImage(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="loading-text section-container">טוען פרטי דירה...</p>;
  }

  if (error || !apartment) {
    return (
      <div className="detail-error section-container">
        <h2>הדירה לא נמצאה</h2>
        <p>{error || 'לא הצלחנו למצוא את הדירה המבוקשת'}</p>
        <Link to="/apartments" className="back-link">חזרה לרשימת הדירות</Link>
      </div>
    );
  }

  const images = apartment.images?.length ? apartment.images : [apartment.image];
  const amenities = apartment.amenities?.length ? apartment.amenities : DEFAULT_AMENITIES;
  const rating = apartment.rating ?? 4.9;

  return (
    <div className="detail-page section-container">
      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="gallery-main">
            <img src={images[activeImage]} alt={apartment.title} />
          </div>
          <div className="gallery-thumbs">
            {images.map((img, index) => (
              <button
                key={img}
                type="button"
                className={index === activeImage ? 'thumb active' : 'thumb'}
                onClick={() => setActiveImage(index)}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-info-card">
          <h1>{apartment.title.toUpperCase()}</h1>
          <p className="detail-description">{apartment.description}</p>
          <p className="detail-address">📍 {apartment.address || apartment.location}</p>

          <div className="detail-specs">
            <span>{apartment.max_guests} אורחים</span>
            <span>{apartment.bedrooms} חדרים</span>
            <span>{apartment.bathrooms} חדרי רחצה</span>
          </div>

          <div className="amenities-section">
            <div className="amenities-header">
              <h3>מתקנים</h3>
              <span className="detail-rating">★ {rating}/5</span>
            </div>
            <ul className="amenities-list">
              {amenities.map((item) => (
                <li key={item.label}>
                  <span>{item.icon}</span> {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="detail-booking">
          <div className="booking-card">
            <h3>בדיקת זמינות והזמנה</h3>
            <div className="booking-field">
              <span>📅</span>
              <input type="text" placeholder="תאריכים" />
            </div>
            <div className="booking-field">
              <span>👤</span>
              <input type="number" min="1" placeholder="אורחים" />
            </div>
            <p className="booking-price">₪{apartment.price_per_night} / לילה</p>
            <button
              type="button"
              className="book-btn btn-primary"
              disabled={!apartment.is_available}
            >
              {apartment.is_available ? 'הזמן עכשיו' : 'לא זמין'}
            </button>
          </div>

          <div className="calendar-placeholder">
            <p className="calendar-title">לוח שנה</p>
            <div className="calendar-grid">
              {Array.from({ length: 28 }, (_, i) => (
                <span
                  key={i}
                  className={i >= 11 && i <= 26 ? 'day booked' : 'day'}
                >
                  {i + 1}
                </span>
              ))}
            </div>
            <p className="calendar-note">תאריכים מסומנים — תפוסים (דוגמה)</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ApartmentDetailPage;

