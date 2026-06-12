import { Link } from 'react-router-dom';
import { getApartmentCategories } from '../data/categories';
import { updateApartment } from '../services/api';
import EditableImage from './EditableImage';
import './ApartmentCard.css';

function ApartmentCard({ apartment, onApartmentUpdate }) {
  const categories = getApartmentCategories(apartment);

  async function saveCoverImage(url) {
    const images = apartment.images?.length
      ? [...apartment.images]
      : [apartment.image].filter(Boolean);
    if (images.length === 0) images.push(url);
    else images[0] = url;
    const updated = await updateApartment(apartment.id, { images, image_url: url });
    onApartmentUpdate?.(updated);
  }

  return (
    <article className={`apartment-card ${!apartment.is_available ? 'unavailable' : ''}`}>
      <EditableImage
        id={`apt.${apartment.id}.cover`}
        src={apartment.image}
        alt={apartment.title}
        className="card-image-wrap"
        imgClassName="card-image"
        onSave={saveCoverImage}
      />

      <div className="card-body">
        <div className="card-header-row">
          <h3 className="card-title">{apartment.title}</h3>
        </div>

        <div className="card-meta">
          <span className="meta-item">🚪 {apartment.bedrooms} חדרים</span>
          <span className="meta-item">👥 {apartment.max_guests} אורחים</span>
        </div>

        {categories.length > 0 && (
          <div className="card-categories">
            {categories.map((cat) => (
              <span key={cat} className="meta-category">
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <p className="card-price">
            החל מ-₪{apartment.price_per_night}
            <span className="per-night"> / לילה</span>
          </p>
          <Link to={`/apartments/${apartment.id}`} className="card-link btn-outline-gold">
            לפרטים
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ApartmentCard;
