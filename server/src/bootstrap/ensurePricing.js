import fs from 'fs';
import pool from '../config/db.js';
import { PRICING_SEED_ROWS } from '../data/pricingSeed.js';
import { executeBootstrapSql, resolveDbFile } from '../utils/resolveDbFile.js';

export async function ensurePricingSeed() {
  const ddlPath = resolveDbFile('pricing_tables.sql');
  if (ddlPath) {
    await executeBootstrapSql(pool, fs.readFileSync(ddlPath, 'utf8'));
  } else {
    console.warn('[pricing] pricing_tables.sql not found — skipping DDL (will seed if table exists)');
  }

  let count = 0;
  try {
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM pricing_plans');
    count = Number(n);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[pricing] pricing_plans table missing — cannot seed');
      return;
    }
    throw e;
  }

  if (count > 0) {
    return;
  }

  for (const row of PRICING_SEED_ROWS) {
    await pool.query(
      `INSERT INTO pricing_plans
       (slug, category, name, description, price, compare_at_price, currency, duration_months, duration_label,
        features_json, highlight_type, badge_text, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)`,
      [
        row.slug,
        row.category,
        row.name,
        row.description,
        row.price,
        row.compare_at_price,
        row.currency,
        row.duration_months,
        row.duration_label,
        JSON.stringify(row.features),
        row.highlight_type,
        row.badge_text,
        row.sort_order,
        row.is_active ? 1 : 0,
      ],
    );
  }

  console.log(`[pricing] Seeded ${PRICING_SEED_ROWS.length} default pricing plans`);
}
