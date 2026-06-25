import { Link } from 'react-router-dom';
import { getApartmentCategories } from '../data/categories';
import { updateApartment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApartmentCoverUrl } from '../utils/mediaUrl';
import EditableImage from './EditableImage';
import './styles/ApartmentCard.css';

function ApartmentCard({ apartment, onApartmentUpdate }) {
  const { isAdmin } = useAuth();
  const categories = getApartmentCategories(apartment);
  const coverUrl = getApartmentCoverUrl(apartment);
  const detailUrl = `/apartments/${apartment.id}`;

  async function saveCoverImage(url) {
    const images = apartment.images?.length
      ? [...apartment.images]
      : [apartment.image].filter(Boolean);
    if (images.length === 0) images.push(url);
    else images[0] = url;
    const updated = await updateApartment(apartment.id, { images, image_url: url });
    onApartmentUpdate?.(updated);
  }

  const card = (
    <article className={`apartment-card ${!apartment.is_available ? 'unavailable' : ''}`}>
      <div className="card-image-wrap">
        {coverUrl ? (
          isAdmin ? (
            <EditableImage
              id={`apt.${apartment.id}.cover`}
              src={coverUrl}
              alt={apartment.title}
              className="card-image-inner"
              imgClassName="card-image"
              onSave={saveCoverImage}
            />
          ) : (
            <img src={coverUrl} alt={apartment.title} className="card-image" loading="lazy" />
          )
        ) : (
          <div className="card-image-placeholder" aria-hidden="true">
            <span>📷</span>
            <span>אין תמונה</span>
          </div>
        )}
      </div>

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
          <span className="card-link btn-outline-gold">לפרטים</span>
        </div>
      </div>
    </article>
  );

  if (isAdmin) {
    return card;
  }

  return (
    <Link to={detailUrl} className="apartment-card-link" aria-label={`פרטי ${apartment.title}`}>
      {card}
    </Link>
  );
}

export default ApartmentCard;
