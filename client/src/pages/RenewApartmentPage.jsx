import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function RenewApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/list-apartment?resume=${id}`, { replace: true });
  }, [id, navigate]);

  return <p className="loading-text section-container">מעביר לתשלום...</p>;
}

export default RenewApartmentPage;
