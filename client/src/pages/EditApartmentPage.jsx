import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApartmentForm from '../components/ApartmentForm';
import RejectedListingActions from '../components/RejectedListingActions';
import { getApartmentById, resubmitApartmentForApproval, updateApartment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isApartmentOwner } from '../utils/apartmentOwnership';
import '../pages/MyApartmentsPage.css';

function EditApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isRejected = apartment?.status === 'rejected';
  const isOwner = apartment && isApartmentOwner(apartment, user);
  const canResubmit = isRejected && isOwner;
  const isAwaitingPayment = apartment?.status === 'awaiting_payment' && isOwner && !isAdmin;

  function editSubtitle() {
    if (canResubmit) {
      return 'עדכנו את הפרטים לפי סיבת הדחייה. "שמירת שינויים" שומרת בלי לשלוח לאישור; "שליחה לאישור מחדש" שומרת ושולחת למנהל.';
    }
    if (isAwaitingPayment) {
      return 'הדירה אושרה. לאחר השמירה, השלימו תשלום מ"הדירות שלי" — המודעה תעלה לאוויר מיד לאחר התשלום.';
    }
    if (apartment?.status === 'approved' && !isAdmin) {
      return 'שינוי פרטי דירה מפורסמת. לאחר שמירה, הדירה תועבר שוב לאישור המנהל.';
    }
    return 'שינוי פרטי הדירה.';
  }

  useEffect(() => {
    setLoading(true);
    getApartmentById(id)
      .then(setApartment)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(payload) {
    setError(null);
    setSaveSuccess(false);
    setSubmitting(true);
    try {
      const updated = await updateApartment(id, payload);
      setApartment(updated);
      if (canResubmit) {
        setSaveSuccess(true);
      } else {
        navigate(isAdmin ? `/apartments/${id}` : '/my-apartments');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResubmitForApproval(payload) {
    if (!confirm('לשלוח את הדירה שוב לאישור המנהל?')) return;
    setError(null);
    setSaveSuccess(false);
    setResubmitting(true);
    try {
      await updateApartment(id, payload);
      const updated = await resubmitApartmentForApproval(id);
      setApartment(updated);
      navigate('/my-apartments');
    } catch (err) {
      setError(err.message);
    } finally {
      setResubmitting(false);
    }
  }

  if (loading) {
    return <p className="loading-text section-container">טוען...</p>;
  }

  if (error && !apartment) {
    return (
      <div className="section-container">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="list-apt-page section-container">
      <h1 className="page-title">עריכת דירה</h1>
      <p className="page-subtitle">{editSubtitle()}</p>

      {canResubmit && (
        <RejectedListingActions
          apartment={apartment}
          showEditLink={false}
          showResubmitButton
          onResubmitted={(updated) => {
            setApartment(updated);
            navigate('/my-apartments');
          }}
        />
      )}

      {isRejected && isAdmin && !isOwner && (
        <p className="my-apt-reject" role="status">
          <strong>הדירה נדחתה.</strong>{' '}
          {apartment.rejection_reason
            ? `סיבת הדחייה: ${apartment.rejection_reason}`
            : 'לא צוינה סיבת דחייה — פנו למנהל המערכת.'}
        </p>
      )}

      {saveSuccess && (
        <p className="edit-apt-save-success" role="status">
          השינויים נשמרו. כשתהיו מוכנים, לחצו על "שליחה לאישור מחדש".
        </p>
      )}

      <ApartmentForm
        apartment={apartment}
        onSubmit={handleSubmit}
        onSecondarySubmit={canResubmit ? handleResubmitForApproval : undefined}
        submitting={submitting}
        secondarySubmitting={resubmitting}
        error={error}
        submitLabel="שמירת שינויים"
        secondarySubmitLabel={canResubmit ? 'שליחה לאישור מחדש' : undefined}
      />
    </div>
  );
}

export default EditApartmentPage;
