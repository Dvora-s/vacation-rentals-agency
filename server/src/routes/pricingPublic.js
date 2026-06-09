import { Router } from 'express';
import pool from '../config/db.js';
import { bestDiscountedPrice, formatIls, resolveDisplayOriginal } from '../services/pricingCompute.js';

const router = Router();

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

router.get('/catalog', async (_req, res) => {
  try {
    const [plans] = await pool.query(
      `SELECT * FROM pricing_plans WHERE is_active = TRUE ORDER BY category ASC, sort_order ASC, id ASC`,
    );

    const [promos] = await pool.query(
      `SELECT * FROM pricing_promotions
       WHERE is_active = TRUE
         AND starts_at <= NOW()
         AND ends_at >= NOW()`,
    );

    const groups = {};
    for (const row of plans) {
      const cat = row.category;
      if (!groups[cat]) groups[cat] = [];
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

      groups[cat].push({
        id: row.id,
        slug: row.slug,
        category: row.category,
        name: row.name,
        description: row.description,
        basePrice: base,
        effectivePrice: effective,
        currency: row.currency || 'ILS',
        basePriceFormatted: formatIls(base),
        effectivePriceFormatted: formatIls(effective),
        originalPriceFormatted: original != null ? formatIls(original) : null,
        hasDiscount: hasPromo || hasCompareStrike,
        durationMonths: row.duration_months,
        durationLabel: row.duration_label,
        features: parseFeatures(row),
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
      });
    }

    res.json({
      groups: [
        { category: 'hosts', plans: groups.hosts || [] },
        { category: 'hotels', plans: groups.hotels || [] },
      ],
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        error: 'טבלאות מחירון עדיין לא הותקנו. הריצו db/pricing_tables.sql על מסד הנתונים.',
        code: 'PRICING_SCHEMA_MISSING',
      });
    }
    console.error('[pricing/catalog]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
