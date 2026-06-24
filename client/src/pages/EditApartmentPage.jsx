import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApartmentForm from '../components/ApartmentForm';
import { getApartmentById, updateApartment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../pages/MyApartmentsPage.css';

function EditApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getApartmentById(id)
      .then(setApartment)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(payload) {
    setError(null);
    setSubmitting(true);
    try {
      await updateApartment(id, payload);
      navigate(isAdmin ? `/apartments/${id}` : '/my-apartments');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
      <p className="page-subtitle">
        שינוי פרטי הדירה. לאחר שמירה, הדירה תועבר שוב לאישור המנהל (אלא אם אתם מנהלי המערכת).
      </p>

      {apartment?.status === 'rejected' && (
        <p className="my-apt-reject" role="status">
          <strong>הדירה נדחתה.</strong>{' '}
          {apartment.rejection_reason
            ? `סיבת הדחייה: ${apartment.rejection_reason}`
            : 'לא צוינה סיבת דחייה — פנו למנהל המערכת.'}
        </p>
      )}

      <ApartmentForm
        apartment={apartment}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        submitLabel="שמירת שינויים"
      />
    </div>
  );
}

export default EditApartmentPage;
