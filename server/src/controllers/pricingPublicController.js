import { selectActivePlansCatalog, selectActivePromotionsNow } from '../models/pricingModel.js';
import { buildCatalogResponse, buildSeedCatalogResponse } from '../services/pricingCatalogBuild.js';
import { getCheckoutPlansForTier, resolveListingAmount } from '../services/listingPricing.js';

export async function getCheckoutPlans(req, res) {
  const tier = String(req.query.tier || 'standard').toLowerCase();
  const data = await getCheckoutPlansForTier(tier);
  res.json(data);
}

export async function getQuote(req, res) {
  const tier = String(req.query.tier || 'standard').toLowerCase();
  const months = Math.max(1, Number(req.query.months) || 1);
  const quote = await resolveListingAmount(tier, months);
  res.json(quote);
}

export async function getCatalog(_req, res) {
  try {
    const plans = await selectActivePlansCatalog();
    const promos = await selectActivePromotionsNow();

    if (!plans.length) {
      console.warn('[pricing/catalog] empty DB — serving default seed catalog');
      return res.json(buildSeedCatalogResponse());
    }

    res.json(buildCatalogResponse(plans, promos));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[pricing/catalog] table missing — serving default seed catalog');
      return res.json(buildSeedCatalogResponse());
    }
    console.error('[pricing/catalog]', error);
    throw error;
  }
}
