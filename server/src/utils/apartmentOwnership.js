/** האם המשתמש הוא בעל הדירה (לפי owner_id או מייל). */
export function isApartmentOwner(apt, user) {
  if (!apt || !user) return false;
  if (apt.owner_id != null && user.id != null && Number(apt.owner_id) === Number(user.id)) {
    return true;
  }
  const aptEmail = String(apt.owner_email || '')
    .trim()
    .toLowerCase();
  const userEmail = String(user.email || '')
    .trim()
    .toLowerCase();
  return Boolean(aptEmail && userEmail && aptEmail === userEmail);
}
