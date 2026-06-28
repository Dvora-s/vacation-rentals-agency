import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

function preferPublicMysqlHostFromDatabaseUrl() {
  const host = String(process.env.DB_HOST || '').trim();
  if (!host.includes('.internal')) return;
  const urlRaw = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!urlRaw) return;
  try {
    const u = new URL(urlRaw);
    if (u.protocol !== 'mysql:' && u.protocol !== 'mysql2:') return;
    const urlHost = u.hostname;
    if (!urlHost || urlHost.includes('.internal')) return;
    process.env.DB_HOST = urlHost;
    if (u.port) process.env.DB_PORT = u.port;
  } catch {
    /* ignore */
  }
}

preferPublicMysqlHostFromDatabaseUrl();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});
try {
  const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
  console.log('DB:', dbRow.db);
  const [allCols] = await conn.query('SHOW COLUMNS FROM pricing_plans');
  console.log(
    'columns:',
    allCols.map((c) => c.Field).join(', '),
  );
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'listing_slots'`,
  );
  if (cols.length) {
    console.log('listing_slots כבר קיימת');
  } else {
    await conn.query('ALTER TABLE pricing_plans ADD COLUMN listing_slots INT NOT NULL DEFAULT 1');
    console.log('נוספה עמודת listing_slots');
  }
  await conn.query('UPDATE pricing_plans SET listing_slots = 1 WHERE id = 1');
  console.log('direct UPDATE listing_slots OK');
  const [rows] = await conn.query('SELECT id, name, features_json, listing_slots FROM pricing_plans ORDER BY id LIMIT 3');
  console.log('sample rows:', JSON.stringify(rows));
} finally {
  await conn.end();
}
