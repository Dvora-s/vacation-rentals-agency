import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { PRICING_SEED_ROWS } from '../data/pricingSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sanitizeSql(sql) {
  return sql
    .split('\n')
    .filter((line) => {
      const t = line.trim().toUpperCase();
      return !t.startsWith('USE ') && !t.startsWith('CREATE DATABASE');
    })
    .join('\n');
}

export async function ensurePricingSeed() {
  const ddlPath = path.join(__dirname, '../../../db/pricing_tables.sql');
  if (!fs.existsSync(ddlPath)) {
    console.warn('[pricing] pricing_tables.sql not found — skipping pricing bootstrap');
    return;
  }

  await pool.query(sanitizeSql(fs.readFileSync(ddlPath, 'utf8')));

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM pricing_plans');
  if (Number(n) > 0) {
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
