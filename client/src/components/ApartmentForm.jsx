import { useRef, useState } from 'react';
import { CATEGORIES, ALL_YEAR_LABEL, getApartmentCategories } from '../data/categories';
import { uploadImages } from '../services/api';
import './ApartmentForm.css';

const EMPTY = {
  title: '',
  description: '',
  location: '',
  address: '',
  property_type: 'דירה',
  categories: [ALL_YEAR_LABEL],
  price_per_night: '',
  bedrooms: 1,
  bathrooms: 1,
  max_guests: 2,
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  contact_via_whatsapp: false,
  is_available: true,
  images: [],
};

const PROPERTY_TYPES = ['דירה', 'וילה', 'צימר', 'בקתה', 'יחידת אירוח'];

function buildInitial(apartment) {
  if (!apartment) return EMPTY;
  const cats = getApartmentCategories(apartment);
  return {
    ...EMPTY,
    ...apartment,
    categories: cats.length > 0 ? cats : [ALL_YEAR_LABEL],
    price_per_night: apartment.price_per_night ?? '',
    images: apartment.images || [],
    owner_phone: apartment.owner_phone || '',
    owner_email: apartment.owner_email || '',
    owner_name: apartment.owner_name || '',
    address: apartment.address || '',
    description: apartment.description || '',
  };
}

function ApartmentForm({ apartment, onSubmit, submitting, submitLabel, error }) {
  const [form, setForm] = useState(() => buildInitial(apartment));

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCategory(label) {
    setForm((prev) => {
      const exists = prev.categories.includes(label);
      const categories = exists
        ? prev.categories.filter((c) => c !== label)
        : [...prev.categories, label];
      return { ...prev, categories };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const images = form.imagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    // שמירת הקטגוריות בסדר הקבוע של CATEGORIES, מופרדות בפסיק.
    const orderedCats = CATEGORIES.filter((c) => form.categories.includes(c.label)).map(
      (c) => c.label,
    );
    const rental_period = orderedCats.length > 0 ? orderedCats.join(', ') : ALL_YEAR_LABEL;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim(),
      address: form.address.trim() || null,
      property_type: form.property_type,
      rental_period,
      price_per_night: Number(form.price_per_night),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      max_guests: Number(form.max_guests),
      image_url: images[0] || null,
      images,
      owner_name: form.owner_name.trim() || null,
      owner_phone: form.owner_phone.trim() || null,
      owner_email: form.owner_email.trim() || null,
      contact_via_whatsapp: !!form.contact_via_whatsapp,
      is_available: !!form.is_available,
    });
  }

  return (
    <form className="apt-form" onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <fieldset className="apt-fieldset">
        <legend>פרטי הנכס</legend>

        <div className="apt-grid">
          <div className="apt-field apt-field-full">
            <label>כותרת *</label>
            <input
              className="auth-input"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
              placeholder="לדוגמה: דירה ברמה ד3, בית שמש"
            />
          </div>

          <div className="apt-field apt-field-full">
            <label>תיאור</label>
            <textarea
              className="auth-input"
              rows="3"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="תיאור קצר על הדירה"
            />
          </div>

          <div className="apt-field">
            <label>עיר *</label>
            <input
              className="auth-input"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              required
            />
          </div>

          <div className="apt-field">
            <label>כתובת מלאה</label>
            <input
              className="auth-input"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>

          <div className="apt-field">
            <label>סוג נכס</label>
            <select
              className="auth-input"
              value={form.property_type}
              onChange={(e) => update('property_type', e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="apt-field apt-field-full">
            <label>קטגוריות (ניתן לבחור כמה)</label>
            <div className="apt-categories">
              {CATEGORIES.map((cat) => (
                <label key={cat.id} className="apt-category-option">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat.label)}
                    onChange={() => toggleCategory(cat.label)}
                  />
                  <span className="apt-category-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>
            <span className="auth-hint">
              דירה שמסומנת "כל השנה" תופיע בכל הקטגוריות בסינון.
            </span>
          </div>

          <div className="apt-field">
            <label>מחיר ללילה (₪) *</label>
            <input
              type="number"
              min="0"
              step="1"
              className="auth-input"
              value={form.price_per_night}
              onChange={(e) => update('price_per_night', e.target.value)}
              required
            />
          </div>

          <div className="apt-field">
            <label>חדרי שינה</label>
            <input
              type="number"
              min="0"
              className="auth-input"
              value={form.bedrooms}
              onChange={(e) => update('bedrooms', e.target.value)}
            />
          </div>

          <div className="apt-field">
            <label>חדרי רחצה</label>
            <input
              type="number"
              min="0"
              className="auth-input"
              value={form.bathrooms}
              onChange={(e) => update('bathrooms', e.target.value)}
            />
          </div>

          <div className="apt-field">
            <label>נפשות (עד)</label>
            <input
              type="number"
              min="1"
              className="auth-input"
              value={form.max_guests}
              onChange={(e) => update('max_guests', e.target.value)}
            />
          </div>

          <div className="apt-field apt-field-full">
            <label>תמונות (URL בשורה אחת לכל תמונה)</label>
            <textarea
              className="auth-input"
              rows="4"
              value={form.imagesText}
              onChange={(e) => update('imagesText', e.target.value)}
              placeholder="https://...&#10;/apartments/123/main.jpg"
              dir="ltr"
            />
            <span className="auth-hint">
              ניתן להדביק כתובות URL לתמונות, או נתיבים מקומיים תחת public/apartments/
            </span>
          </div>
        </div>
      </fieldset>

      <fieldset className="apt-fieldset">
        <legend>פרטי בעל הנכס</legend>
        <div className="apt-grid">
          <div className="apt-field">
            <label>שם בעל הנכס</label>
            <input
              className="auth-input"
              value={form.owner_name}
              onChange={(e) => update('owner_name', e.target.value)}
            />
          </div>
          <div className="apt-field">
            <label>טלפון ליצירת קשר</label>
            <input
              className="auth-input"
              value={form.owner_phone}
              onChange={(e) => update('owner_phone', e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="apt-field">
            <label>אימייל</label>
            <input
              type="email"
              className="auth-input"
              value={form.owner_email}
              onChange={(e) => update('owner_email', e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="apt-field apt-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.contact_via_whatsapp}
                onChange={(e) => update('contact_via_whatsapp', e.target.checked)}
              />{' '}
              ליצור קשר בוואטסאפ
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => update('is_available', e.target.checked)}
              />{' '}
              זמינה להשכרה כעת
            </label>
          </div>
        </div>
      </fieldset>

      <button type="submit" className="btn-primary apt-submit" disabled={submitting}>
        {submitting ? 'שומרת...' : submitLabel || 'שמירה'}
      </button>
    </form>
  );
}

export default ApartmentForm;
