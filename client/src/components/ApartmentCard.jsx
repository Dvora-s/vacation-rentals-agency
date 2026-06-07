import { Link } from 'react-router-dom';
import { getApartmentCategories } from '../data/categories';
import './ApartmentCard.css';

function ApartmentCard({ apartment }) {
  const categories = getApartmentCategories(apartment);
  return (
    <article className={`apartment-card ${!apartment.is_available ? 'unavailable' : ''}`}>
      <div className="card-image-wrap">
        <img src={apartment.image} alt={apartment.title} className="card-image" />
      </div>

      <div className="card-body">
        <div className="card-header-row">
          <h3 className="card-title">{apartment.title}</h3>
        </div>

        <div className="card-meta">
          <span className="meta-item">🛏 {apartment.bedrooms}</span>
          <span className="meta-item">🛁 {apartment.bathrooms}</span>
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
