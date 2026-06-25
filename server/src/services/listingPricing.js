import { PRICING_SEED_ROWS } from '../data/pricingSeed.js';
import { getPlanAmount as getStaticPlanAmount } from '../config/pricing.js';
import { selectActivePlansCatalog, selectActivePromotionsNow } from '../models/pricingModel.js';
import { bestDiscountedPrice, resolveDisplayOriginal } from './pricingCompute.js';

const TIER_TO_CATEGORY = {
  standard: 'hosts',
  premium: 'hotels',
};

function applicablePromos(promos, planId) {
  return (promos || []).filter(
    (p) => p.pricing_plan_id == null || Number(p.pricing_plan_id) === Number(planId),
  );
}

function buildCheckoutPlanDto(planRow, promos, { tier, syntheticId }) {
  const promosForPlan = applicablePromos(promos, planRow.id);
  const base = Number(planRow.price);
  const { effective, promotion } = bestDiscountedPrice(base, promosForPlan);
  const original = resolveDisplayOriginal({
    basePrice: base,
    effectivePrice: effective,
    compareAtPrice: planRow.compare_at_price,
  });

  return {
    id: syntheticId || planRow.slug || String(planRow.id),
    planId: planRow.id ?? null,
    tier,
    months: Number(planRow.duration_months) || 1,
    title: planRow.name,
    price: effective,
    basePrice: base,
    originalPrice: original != null ? original : undefined,
    badge: planRow.badge_text || undefined,
    variant:
      planRow.highlight_type === 'popular'
        ? 'featured'
        : planRow.highlight_type === 'premium'
          ? 'premium'
          : undefined,
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

async function loadCatalogData() {
  try {
    const [plans, promos] = await Promise.all([
      selectActivePlansCatalog(),
      selectActivePromotionsNow(),
    ]);
    if (plans.length > 0) {
      return { plans, promos, fromDb: true };
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_ACCESS_DENIED_ERROR') throw err;
  }

  let syntheticId = 1;
  const plans = PRICING_SEED_ROWS.filter((r) => r.is_active !== false).map((row) => ({
    ...row,
    id: syntheticId++,
  }));
  return { plans, promos: [], fromDb: false };
}

export async function getCheckoutPlansForTier(tier = 'standard') {
  const normalizedTier = tier === 'premium' ? 'premium' : 'standard';
  const category = TIER_TO_CATEGORY[normalizedTier];
  const { plans, promos } = await loadCatalogData();
  const categoryPlans = plans
    .filter((p) => p.category === category)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

  const checkoutPlans = categoryPlans.map((row) =>
    buildCheckoutPlanDto(row, promos, { tier: normalizedTier }),
  );

  return { tier: normalizedTier, plans: checkoutPlans };
}

export async function resolveListingAmount(tier = 'standard', months = 1) {
  const normalizedTier = tier === 'premium' ? 'premium' : 'standard';
  const monthsInt = Math.max(1, Number(months) || 1);
  const category = TIER_TO_CATEGORY[normalizedTier];
  const { plans, promos } = await loadCatalogData();

  const plan = plans.find(
    (p) => p.category === category && Number(p.duration_months) === monthsInt,
  );

  if (plan) {
    const { effective } = bestDiscountedPrice(plan.price, applicablePromos(promos, plan.id));
    return {
      amount: effective,
      baseAmount: Number(plan.price),
      tier: normalizedTier,
      months: monthsInt,
      planId: plan.id ?? null,
    };
  }

  const staticAmount = getStaticPlanAmount(normalizedTier, monthsInt);
  return {
    amount: staticAmount,
    baseAmount: staticAmount,
    tier: normalizedTier,
    months: monthsInt,
    planId: null,
  };
}
