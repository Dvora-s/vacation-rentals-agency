import pool from '../config/db.js';
import { ensureSiteContentTable, selectAllSiteContent } from '../models/siteContentModel.js';
import { attachImagesToApartments, selectApprovedApartments } from '../models/apartmentModel.js';

export const FEATURED_APARTMENTS_CONTENT_KEY = 'home.featured-apartments';

const PAID_LISTING_SQL = `EXISTS (
  SELECT 1 FROM listing_payments lp
  WHERE lp.apartment_id = a.id AND lp.status IN ('paid', 'authorized')
)`;

function parseFeaturedIds(body) {
  if (!body) return [];
  try {
    const parsed = JSON.parse(String(body));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  } catch {
    return [];
  }
}

export async function readFeaturedApartmentIds() {
  await ensureSiteContentTable();
  const rows = await selectAllSiteContent();
  const row = rows.find((r) => r.content_key === FEATURED_APARTMENTS_CONTENT_KEY);
  return parseFeaturedIds(row?.body);
}

function sortByNewest(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function filterPublicFeatured(rows) {
  return rows.filter((row) => row.is_available !== 0 && row.is_available !== false);
}

export async function selectFeaturedApartments(limit = 4) {
  const max = Math.min(12, Math.max(1, Number(limit) || 4));
  const configuredIds = await readFeaturedApartmentIds();

  if (configuredIds.length === 0) {
    const approved = await selectApprovedApartments();
    return filterPublicFeatured(sortByNewest(approved)).slice(0, max);
  }

  const ids = configuredIds.slice(0, max);
  const placeholders = ids.map(() => '?').join(',');
  const fieldOrder = ids.join(', ');

  const [rows] = await pool.query(
    `SELECT a.* FROM apartments a
     WHERE a.id IN (${placeholders})
       AND a.status = 'approved'
       AND a.is_available = 1
       AND ${PAID_LISTING_SQL}
     ORDER BY FIELD(a.id, ${fieldOrder})`,
    ids,
  );

  return rows;
}

export async function mapFeaturedApartmentsForResponse(limit = 4) {
  const rows = await selectFeaturedApartments(limit);
  return attachImagesToApartments(rows);
}
