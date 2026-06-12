import { Link } from 'react-router-dom';
import { HOMEPAGE_CATEGORIES } from '../data/categories';
import EditableText from './EditableText';
import EditableImage from './EditableImage';
import './CategoriesShowcase.css';

function CategoriesShowcase() {
  return (
    <section className="categories-showcase section-container">
      <div className="categories-showcase-head">
        <span className="categories-divider" />
        <EditableText as="h2" id="home.categories.title" className="categories-title">
          הקטגוריות שלנו
        </EditableText>
      </div>
      <EditableText as="p" id="home.categories.subtitle" className="categories-subtitle">
        מצא את הנכס המתאים לכל זמן ובכל גודל.
      </EditableText>

      <div className="categories-showcase-grid">
        {HOMEPAGE_CATEGORIES.map((cat) => (
          <EditableImage
            key={cat.id}
            id={`home.categories.${cat.id}.image`}
            src={cat.image}
            mode="background"
            as={Link}
            to={`/apartments?category=${cat.id}`}
            className="category-showcase-card"
          >
            <div className="category-showcase-overlay" />
            <div className="category-showcase-content">
              <EditableText as="h3" id={`home.categories.${cat.id}.title`}>
                {cat.title}
              </EditableText>
              <EditableText as="p" id={`home.categories.${cat.id}.subtitle`}>
                {cat.subtitle}
              </EditableText>
            </div>
          </EditableImage>
        ))}
      </div>
    </section>
  );
}

export default CategoriesShowcase;
