import { selectFaqCatalogRows } from '../models/faqModel.js';
import { buildFaqSectionsFromRows, buildSeedFaqResponse } from '../services/faqCatalogBuild.js';

export async function getFaqCatalog(_req, res) {
  try {
    const rows = await selectFaqCatalogRows();

    if (!rows.length) {
      console.warn('[faq] empty DB — serving default seed FAQ');
      return res.json(buildSeedFaqResponse());
    }

    res.json({ sections: buildFaqSectionsFromRows(rows) });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[faq] table missing — serving default seed FAQ');
      return res.json(buildSeedFaqResponse());
    }
    throw e;
  }
}
