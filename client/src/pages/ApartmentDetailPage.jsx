import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApartmentById, sendListingInquiry, updateApartment } from '../services/api';
import EditableImage from '../components/EditableImage';
import { getApartmentCategories } from '../data/categories';
import { useAuth } from '../context/AuthContext';
import './ApartmentDetailPage.css';

const STATUS_LABELS = {
  pending: 'ממתין לאישור',
  approved: 'מפורסם',
  rejected: 'נדחה',
  expired: 'פג תוקף',
};

function ApartmentDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showEmail, setShowEmail] = useState(false);

  // טופס "שלח הודעה" לבעל הנכס
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiry, setInquiry] = useState({ email: '', message: '' });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryError, setInquiryError] = useState(null);
  const [inquirySent, setInquirySent] = useState(false);

  async function handleInquirySubmit(e) {
    e.preventDefault();
    setInquiryError(null);
    setInquirySubmitting(true);
    try {
      await sendListingInquiry(apartment.id, {
        email: inquiry.email.trim(),
        message: inquiry.message.trim(),
      });
      setInquirySent(true);
    } catch (err) {
      setInquiryError(err.message || 'שליחת ההודעה נכשלה.');
    } finally {
      setInquirySubmitting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);

    getApartmentById(id)
      .then((data) => {
        setApartment(data);
        setActiveImage(0);
        setShowInquiry(false);
        setInquirySent(false);
        setInquiryError(null);
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

  async function saveGalleryImage(index, url) {
    const nextImages = [...images];
    nextImages[index] = url;
    const updated = await updateApartment(apartment.id, {
      images: nextImages,
      image_url: nextImages[0],
    });
    setApartment(updated);
  }
  const phone = apartment.owner_phone;
  const whatsappNumber = phone ? phone.replace(/[^0-9]/g, '').replace(/^0/, '972') : null;
  // שליחת הודעה במייל — רק למודעות מאושרות שיש להן מייל לבעלים.
  const canInquire =
    apartment.can_inquire ??
    (apartment.status === 'approved' && Boolean(apartment.owner_email));

  // מנהל יכול לערוך כל דירה בכל שלב; בעל הנכס יכול לערוך את הדירות שלו.
  const canManage =
    isAdmin || (user && apartment.owner_id && user.id === apartment.owner_id);

  return (
    <div className="detail-page section-container">
      {canManage && (
        <div className="detail-manage-bar">
          {apartment.status && (
            <span className={`status-pill status-${apartment.status}`}>
              {STATUS_LABELS[apartment.status] || apartment.status}
            </span>
          )}
          <Link
            to={`/my-apartments/${apartment.id}/edit`}
            className="btn-outline-gold detail-manage-edit"
          >
            ✎ עריכת דירה
          </Link>
        </div>
      )}

      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="gallery-main">
            <EditableImage
              id={`apt.${apartment.id}.gallery.${activeImage}`}
              src={images[activeImage]}
              alt={apartment.title}
              className="gallery-main-editable"
              onSave={(url) => saveGalleryImage(activeImage, url)}
            />
          </div>
          <div className="gallery-thumbs">
            {images.map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                className={index === activeImage ? 'thumb active' : 'thumb'}
                onClick={() => setActiveImage(index)}
              >
                <EditableImage
                  id={`apt.${apartment.id}.gallery.${index}`}
                  src={img}
                  alt=""
                  onSave={(url) => saveGalleryImage(index, url)}
                />
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

            {phone && (
              <div className="contact-info">
                <p className="contact-phone" dir="ltr">{phone}</p>
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
              {apartment.owner_email &&
                (showEmail ? (
                  <span className="btn-outline-gold contact-btn contact-email-revealed" dir="ltr">
                    {apartment.owner_email}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-outline-gold contact-btn"
                    onClick={() => setShowEmail(true)}
                  >
                    ✉️ אימייל
                  </button>
                ))}

              {canInquire && (
                <button
                  type="button"
                  className="btn-primary contact-btn"
                  onClick={() => setShowInquiry((v) => !v)}
                >
                  📨 שליחת הודעה
                </button>
              )}
            </div>

            {canInquire && showInquiry && (
              <div className="inquiry-box">
                {inquirySent ? (
                  <div className="inquiry-success">
                    <span aria-hidden="true">✅</span>
                    <p>ההודעה נשלחה לבעל הנכס! הוא יוכל להשיב לכם ישירות למייל שהזנתם.</p>
                  </div>
                ) : (
                  <form className="inquiry-form" onSubmit={handleInquirySubmit}>
                    <h4>שליחת הודעה לבעל הנכס</h4>
                    {inquiryError && <div className="auth-error">{inquiryError}</div>}

                    <label htmlFor="inquiry-email">האימייל שלכם</label>
                    <input
                      id="inquiry-email"
                      type="email"
                      className="auth-input"
                      value={inquiry.email}
                      onChange={(e) => setInquiry((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@example.com"
                      required
                      dir="ltr"
                    />

                    <label htmlFor="inquiry-message">תוכן ההודעה</label>
                    <textarea
                      id="inquiry-message"
                      className="auth-input inquiry-textarea"
                      value={inquiry.message}
                      onChange={(e) => setInquiry((p) => ({ ...p, message: e.target.value }))}
                      placeholder="היי, אשמח לפרטים נוספים לגבי הדירה והזמינות בתאריכים..."
                      rows={4}
                      required
                    />

                    <button
                      type="submit"
                      className="btn-primary contact-btn"
                      disabled={inquirySubmitting}
                    >
                      {inquirySubmitting ? 'שולח...' : 'שליחה'}
                    </button>
                  </form>
                )}
              </div>
            )}

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
