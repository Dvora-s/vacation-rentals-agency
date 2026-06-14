import { useRef, useState } from 'react';
import { CATEGORIES, ALL_YEAR_LABEL, getApartmentCategories } from '../data/categories';
import { CITY_NAMES, getStreetsForCity } from '../data/locations';
import { COMPLEX_PROPERTY_TYPE, MAX_GUESTS_NON_COMPLEX } from '../data/pricing';
import Combobox from './Combobox';
import { uploadImages } from '../services/api';
import './styles/ApartmentForm.css';

const EMPTY = {
  title: '',
  description: '',
  location: '',
  street: '',
  house_number: '',
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

const PROPERTY_TYPES = ['דירה', 'וילה', 'צימר', 'בקתה', 'יחידת אירוח', COMPLEX_PROPERTY_TYPE];

// מפרק כתובת מאוחסנת (למשל "הרצל 5") לרחוב ומספר בית, לצורך עריכה.
function splitAddress(address) {
  const raw = (address || '').trim();
  if (!raw) return { street: '', house_number: '' };
  const match = raw.match(/^(.*?)[\s,]*(\d+\w*)$/);
  if (match) {
    return { street: match[1].trim(), house_number: match[2].trim() };
  }
  return { street: raw, house_number: '' };
}

function buildInitial(apartment) {
  if (!apartment) return EMPTY;
  const cats = getApartmentCategories(apartment);
  const { street, house_number } = splitAddress(apartment.address);
  return {
    ...EMPTY,
    ...apartment,
    categories: cats.length > 0 ? cats : [ALL_YEAR_LABEL],
    price_per_night: apartment.price_per_night ?? '',
    images: apartment.images || [],
    owner_phone: apartment.owner_phone || '',
    owner_email: apartment.owner_email || '',
    owner_name: apartment.owner_name || '',
    street,
    house_number,
    description: apartment.description || '',
  };
}

function ApartmentForm({ apartment, onSubmit, submitting, submitLabel, error }) {
  const [form, setForm] = useState(() => buildInitial(apartment));
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [formError, setFormError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // בחירת עיר חדשה מאפסת את הרחוב (הרחובות תלויים בעיר שנבחרה).
  function setCity(city) {
    setForm((prev) => ({
      ...prev,
      location: city,
      street: prev.location === city ? prev.street : '',
    }));
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

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleFileInput(e) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  function removeImage(index) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    setUrlInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    // מעל סף המיטות לנכס שאינו "מתחמי אירוח" — חוסם המשך.
    if (
      form.property_type !== COMPLEX_PROPERTY_TYPE &&
      Number(form.max_guests) > MAX_GUESTS_NON_COMPLEX
    ) {
      setFormError('אופס, יותר מדי מיטות זה מתחמי אירוח.');
      return;
    }

    const images = form.images.filter(Boolean);
    // שמירת הקטגוריות בסדר הקבוע של CATEGORIES, מופרדות בפסיק.
    const orderedCats = CATEGORIES.filter((c) => form.categories.includes(c.label)).map(
      (c) => c.label,
    );
    const rental_period = orderedCats.length > 0 ? orderedCats.join(', ') : ALL_YEAR_LABEL;
    const address =
      [form.street.trim(), String(form.house_number).trim()].filter(Boolean).join(' ') || null;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim(),
      address,
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
      {formError && <div className="auth-error">{formError}</div>}

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
            <Combobox
              value={form.location}
              onChange={setCity}
              options={CITY_NAMES}
              placeholder="בחרו עיר מהרשימה"
              emptyText="לא נמצאה עיר תואמת"
              required
            />
          </div>

          <div className="apt-field">
            <label>רחוב</label>
            {/* בחירה מתוך מאגר הרחובות של העיר, או הקלדת רחוב חדש שאינו ברשימה */}
            <input
              className="auth-input"
              list="street-options"
              value={form.street}
              onChange={(e) => update('street', e.target.value)}
              placeholder={form.location ? 'בחרו רחוב מהרשימה או הקלידו רחוב חדש' : 'בחרו קודם עיר'}
              disabled={!form.location}
              autoComplete="off"
            />
            <datalist id="street-options">
              {getStreetsForCity(form.location).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="apt-field">
            <label>מספר בית</label>
            <input
              className="auth-input"
              value={form.house_number}
              onChange={(e) => update('house_number', e.target.value)}
              placeholder="לדוגמה: 12"
              inputMode="numeric"
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
            <label>תמונות</label>
            <div
              className={`apt-dropzone ${dragOver ? 'dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFileInput}
              />
              <span className="apt-dropzone-icon">📷</span>
              <p className="apt-dropzone-text">
                גררו לכאן תמונות מהמחשב, או לחצו לבחירת קבצים
              </p>
              <span className="auth-hint">jpg, png, webp, gif · עד 8MB לתמונה</span>
              {uploading && <p className="apt-dropzone-status">מעלה תמונות...</p>}
            </div>
            {uploadError && <span className="auth-error">{uploadError}</span>}

            {form.images.length > 0 && (
              <div className="apt-thumbs">
                {form.images.map((url, index) => (
                  <div className="apt-thumb" key={`${url}-${index}`}>
                    <img src={url} alt="" />
                    <button
                      type="button"
                      className="apt-thumb-remove"
                      onClick={() => removeImage(index)}
                      aria-label="הסר תמונה"
                    >
                      ×
                    </button>
                    {index === 0 && <span className="apt-thumb-badge">ראשית</span>}
                  </div>
                ))}
              </div>
            )}

            <details className="apt-url-add">
              <summary>או הוספה לפי קישור (URL)</summary>
              <div className="apt-url-row">
                <input
                  className="auth-input"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <button type="button" className="btn-outline-gold" onClick={addUrl}>
                  הוסף
                </button>
              </div>
            </details>
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
