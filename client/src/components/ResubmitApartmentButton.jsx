import { useState } from 'react';
import { resubmitApartmentForApproval } from '../services/api';

/**
 * כפתור שליחה חוזרת לאישור — לדירה בסטטוס rejected בלבד.
 */
export default function ResubmitApartmentButton({
  apartment,
  onResubmitted,
  className = 'btn-primary',
  children = 'שליחה לאישור מחדש',
}) {
  const [busy, setBusy] = useState(false);

  if (!apartment || apartment.status !== 'rejected') return null;

  async function handleClick() {
    if (!confirm('לשלוח את הדירה שוב לאישור המנהל?')) return;
    setBusy(true);
    try {
      const updated = await resubmitApartmentForApproval(apartment.id);
      onResubmitted?.(updated);
    } catch (err) {
      alert(err.message || 'השליחה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy}>
      {busy ? 'שולח...' : children}
    </button>
  );
}
