export const FEATURED_APARTMENTS_CONTENT_KEY = 'home.featured-apartments';
export const FEATURED_APARTMENTS_LIMIT = 4;

export function parseFeaturedApartmentIds(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  } catch {
    return [];
  }
}
