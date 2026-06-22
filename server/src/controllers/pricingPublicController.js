import { selectActivePlansCatalog, selectActivePromotionsNow } from '../models/pricingModel.js';
import { buildCatalogResponse, buildSeedCatalogResponse } from '../services/pricingCatalogBuild.js';

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
