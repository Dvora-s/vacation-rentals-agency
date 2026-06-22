import { PRICING_SEED_ROWS } from '../data/pricingSeed.js';
import { bestDiscountedPrice, formatIls, resolveDisplayOriginal } from './pricingCompute.js';

function parseFeatures(row) {
  try {
    const j = row.features_json;
    if (Array.isArray(j)) return j.map(String);
    if (typeof j === 'string') return JSON.parse(j);
    return [];
  } catch {
    return [];
  }
}

export function buildPlanDto(row, promos = [], { syntheticId = null } = {}) {
  const applicable = promos.filter(
    (p) => p.pricing_plan_id == null || Number(p.pricing_plan_id) === Number(row.id),
  );
  const { effective, promotion } = bestDiscountedPrice(row.price, applicable);
  const base = Number(row.price);
  const original = resolveDisplayOriginal({
    basePrice: base,
    effectivePrice: effective,
    compareAtPrice: row.compare_at_price,
  });

  const hasPromo = effective < base - 1e-9;
  const cmp = row.compare_at_price != null ? Number(row.compare_at_price) : null;
  const hasCompareStrike =
    cmp != null && Number.isFinite(cmp) && cmp > effective + 1e-9 && !hasPromo;

  return {
    id: syntheticId ?? row.id,
    slug: row.slug,
    category: row.category,
    name: row.name,
    description: row.description ?? null,
    basePrice: base,
    effectivePrice: effective,
    currency: row.currency || 'ILS',
    basePriceFormatted: formatIls(base),
    effectivePriceFormatted: formatIls(effective),
    originalPriceFormatted: original != null ? formatIls(original) : null,
    hasDiscount: hasPromo || hasCompareStrike,
    durationMonths: row.duration_months,
    durationLabel: row.duration_label,
    features: Array.isArray(row.features) ? row.features : parseFeatures(row),
    highlightType: row.highlight_type,
    badgeText: row.badge_text,
    promotion: promotion
      ? {
          id: promotion.id,
          name: promotion.name,
          discountType: promotion.discount_type,
          discountValue: Number(promotion.discount_value),
        }
      : null,
  };
}

export function buildCatalogResponse(plans, promos = []) {
  const groups = {};
  for (const row of plans) {
    const cat = row.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(buildPlanDto(row, promos));
  }

  return {
    groups: [
      { category: 'hosts', plans: groups.hosts || [] },
      { category: 'hotels', plans: groups.hotels || [] },
    ],
  };
}

/** גיבוי כשהמסד ריק — אותם מסלולים כמו ב-seed */
export function buildSeedCatalogResponse() {
  let syntheticId = 1;
  const plans = PRICING_SEED_ROWS.filter((r) => r.is_active !== false).map((row) => ({
    ...row,
    id: syntheticId++,
    features_json: row.features,
  }));
  return buildCatalogResponse(plans, []);
}
