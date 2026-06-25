import { useState } from 'react';
import { resubmitApartmentForApproval } from '../services/api';

/**
 * כפתור שליחה חוזרת לאישור — לדירה שנדחתה או שפג תוקפה.
 */
export default function ResubmitApartmentButton({
  apartment,
  onResubmitted,
  className = 'btn-primary',
  children = 'שליחה מחדש',
}) {
  const [busy, setBusy] = useState(false);

  if (!apartment) return null;
  const status = String(apartment.status || '').toLowerCase();
  const canResubmit = status === 'rejected' || status === 'expired';
  if (!canResubmit) return null;

  async function handleClick() {
    const label = status === 'expired' ? 'לשלוח את הדירה שוב לאישור המנהל?' : 'לשלוח את הדירה שוב לאישור המנהל?';
    if (!confirm(label)) return;
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
