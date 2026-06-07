import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApartmentById } from '../services/api';
import { getApartmentCategories } from '../data/categories';
import './ApartmentDetailPage.css';

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
  const phone = apartment.owner_phone;
  const whatsappNumber = phone ? phone.replace(/[^0-9]/g, '').replace(/^0/, '972') : null;

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
          <h1>{apartment.title}</h1>
          <p className="detail-description">{apartment.description}</p>
          <p className="detail-address">📍 {apartment.address || apartment.location}</p>

          <div className="detail-specs">
            <span>{apartment.max_guests} אורחים</span>
            <span>{apartment.bedrooms} חדרי שינה</span>
            <span>{apartment.bathrooms} חדרי רחצה</span>
          </div>

          <div className="detail-tags">
            {apartment.property_type && (
              <span className="detail-tag">{apartment.property_type}</span>
            )}
            {getApartmentCategories(apartment).map((cat) => (
              <span key={cat} className="detail-tag">
                {cat}
              </span>
            ))}
          </div>
        </div>

        <aside className="detail-booking">
          <div className="contact-card">
            <h3>יצירת קשר עם בעל הנכס</h3>
            <p className="contact-price">החל מ-₪{apartment.price_per_night} / לילה</p>

            {(apartment.owner_name || phone) && (
              <div className="contact-info">
                {apartment.owner_name && (
                  <p className="contact-name">{apartment.owner_name}</p>
                )}
                {phone && <p className="contact-phone" dir="ltr">{phone}</p>}
              </div>
            )}

            <div className="contact-actions">
              {phone && (
                <a className="btn-primary contact-btn" href={`tel:${phone}`}>
                  📞 התקשרו
                </a>
              )}
              {whatsappNumber && (
                <a
                  className="btn-outline-gold contact-btn"
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 וואטסאפ
                </a>
              )}
              {apartment.owner_email && (
                <a
                  className="btn-outline-gold contact-btn"
                  href={`mailto:${apartment.owner_email}`}
                >
                  ✉️ אימייל
                </a>
              )}
            </div>

            <p className="contact-note">
              ⓘ הזמינות והתאריכים מתואמים ישירות מול בעל הנכס.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ApartmentDetailPage;
