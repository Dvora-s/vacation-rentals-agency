/** האם המשתמש הוא בעל הדירה (לפי owner_id או מייל). */
export function isApartmentOwner(apt, user) {
  if (!apt || !user) return false;
  if (apt.owner_id && apt.owner_id === user.id) return true;
  const aptEmail = String(apt.owner_email || '')
    .trim()
    .toLowerCase();
  const userEmail = String(user.email || '')
    .trim()
    .toLowerCase();
  return Boolean(aptEmail && userEmail && aptEmail === userEmail);
}
