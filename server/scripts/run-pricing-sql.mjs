// הרצת db/pricing_tables.sql (ו־seed_pricing.sql אם קיים) — אותו חיבור כמו setup-db.mjs
// מריץ מתוך server/:  node scripts/run-pricing-sql.mjs

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRICING_SEED_ROWS } from '../src/data/pricingSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const dbDir = path.join(serverRoot, '../db');

const envLocalPath = path.join(serverRoot, '.env.local');
dotenv.config({ path: path.join(serverRoot, '.env') });
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function getSslConfig() {
  const sslMode = (process.env.DB_SSL_MODE || '').toUpperCase();
  if (['OFF', 'DISABLED', 'FALSE', ''].includes(sslMode)) return undefined;
  const caPath = path.join(dbDir, 'ca.pem');
  if (fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

function sanitize(sql) {
  return sql
    .split('\n')
    .filter((line) => {
      const t = line.trim().toUpperCase();
      return !t.startsWith('USE ') && !t.startsWith('CREATE DATABASE');
    })
    .join('\n');
}

async function run() {
  const pricingPath = path.join(dbDir, 'pricing_tables.sql');
  const seedPricingPath = path.join(dbDir, 'seed_pricing.sql');

  if (!fs.existsSync(pricingPath)) {
    console.error('Missing file:', pricingPath);
    process.exit(1);
  }

  console.log(`Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} / ${process.env.DB_NAME} ...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getSslConfig(),
    multipleStatements: true,
    connectTimeout: 20000,
  });

  try {
    console.log('Running pricing_tables.sql ...');
    await conn.query(sanitize(fs.readFileSync(pricingPath, 'utf8')));
    console.log('  ✓ pricing_plans, pricing_promotions');

    if (fs.existsSync(seedPricingPath)) {
      console.log('Running seed_pricing.sql ...');
      await conn.query(sanitize(fs.readFileSync(seedPricingPath, 'utf8')));
      console.log('  ✓ seed pricing');
    }

    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM pricing_plans');
    if (Number(rows[0].n) === 0) {
      console.log('Seeding default pricing plans ...');
      for (const row of PRICING_SEED_ROWS) {
        await conn.query(
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
      console.log(`  ✓ inserted ${PRICING_SEED_ROWS.length} plans`);
    } else {
      console.log(`  (skip seed: pricing_plans already has ${rows[0].n} rows)`);
    }

    const [countRows] = await conn.query('SELECT COUNT(*) AS n FROM pricing_plans');
    console.log(`\npricing_plans rows: ${countRows[0].n}`);
    console.log('Done ✅');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
