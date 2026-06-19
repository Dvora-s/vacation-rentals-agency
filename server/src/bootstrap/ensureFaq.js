import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { FAQ_SEED_ROWS } from '../data/faqSeed.js';

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

export async function ensureFaqSeed() {
  const ddlPath = path.join(__dirname, '../../../db/faq_tables.sql');
  if (!fs.existsSync(ddlPath)) {
    console.warn('[faq] faq_tables.sql not found — skipping FAQ bootstrap');
    return;
  }

  await pool.query(sanitizeSql(fs.readFileSync(ddlPath, 'utf8')));

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM faq_items');
  if (Number(n) > 0) {
    return;
  }

  for (const row of FAQ_SEED_ROWS) {
    await pool.query(
      'INSERT INTO faq_items (section, question, answer, sort_order) VALUES (?, ?, ?, ?)',
      [row.section, row.question, row.answer, row.sort_order],
    );
  }

  console.log(`[faq] Seeded ${FAQ_SEED_ROWS.length} default FAQ items`);
}
