// יוצר טבלת faq_items ומזרים נתוני התחלה אם הטבלה ריקה.
// מריץ מתוך server/:  npm run setup-faq

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

import { FAQ_SEED_ROWS } from '../src/data/faqSeed.js';

async function run() {
  const ddlPath = path.join(dbDir, 'faq_tables.sql');
  if (!fs.existsSync(ddlPath)) {
    console.error('Missing:', ddlPath);
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
    console.log('Running faq_tables.sql ...');
    await conn.query(sanitize(fs.readFileSync(ddlPath, 'utf8')));
    console.log('  ✓ faq_items');

    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM faq_items');
    if (Number(n) === 0) {
      console.log('Seeding default FAQ rows ...');
      for (const row of FAQ_SEED_ROWS) {
        await conn.query(
          `INSERT INTO faq_items (section, question, answer, sort_order) VALUES (?, ?, ?, ?)`,
          [row.section, row.question, row.answer, row.sort_order],
        );
      }
      console.log(`  ✓ inserted ${FAQ_SEED_ROWS.length} items`);
    } else {
      console.log(`  (skip seed: faq_items already has ${n} rows)`);
    }

    const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM faq_items');
    console.log(`\nfaq_items rows: ${total}\nDone.`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
