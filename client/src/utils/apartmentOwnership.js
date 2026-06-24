/** האם המשתמש המחובר הוא בעל הדירה (לפי owner_id או מייל). */
export function isApartmentOwner(apartment, user) {
  if (!apartment || !user) return false;
  if (apartment.owner_id && user.id === apartment.owner_id) return true;
  const aptEmail = String(apartment.owner_email || '')
    .trim()
    .toLowerCase();
  const userEmail = String(user.email || '')
    .trim()
    .toLowerCase();
  return Boolean(aptEmail && userEmail && aptEmail === userEmail);
}
