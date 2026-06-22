import fs from 'fs';
import pool from '../config/db.js';
import { FAQ_SEED_ROWS } from '../data/faqSeed.js';
import { executeBootstrapSql, resolveDbFile } from '../utils/resolveDbFile.js';

export async function ensureFaqSeed() {
  const ddlPath = resolveDbFile('faq_tables.sql');
  if (ddlPath) {
    await executeBootstrapSql(pool, fs.readFileSync(ddlPath, 'utf8'));
  } else {
    console.warn('[faq] faq_tables.sql not found — skipping DDL (will seed if table exists)');
  }

  let count = 0;
  try {
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM faq_items');
    count = Number(n);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[faq] faq_items table missing — cannot seed');
      return;
    }
    throw e;
  }

  if (count > 0) {
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
