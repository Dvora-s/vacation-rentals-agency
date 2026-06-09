import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** תיקיית `server/` — לא תלוי ב-process.cwd() (חשוב כשמריצים מ-root או עם proxy) */
const serverRoot = path.join(__dirname, '../..');
const envPath = path.join(serverRoot, '.env');
const envLocalPath = path.join(serverRoot, '.env.local');

dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function applyDatabaseUrlIfNeeded() {
  const hasUser = process.env.DB_USER && String(process.env.DB_USER).trim() !== '';
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (hasUser || !url) return;
  try {
    const u = new URL(url);
    if (u.protocol !== 'mysql:' && u.protocol !== 'mysql2:') return;
    if (!process.env.DB_HOST) process.env.DB_HOST = u.hostname;
    if (!process.env.DB_PORT || process.env.DB_PORT === '') {
      process.env.DB_PORT = u.port || '3306';
    }
    if (!process.env.DB_USER) process.env.DB_USER = decodeURIComponent(u.username);
    if (process.env.DB_PASSWORD === undefined || process.env.DB_PASSWORD === '') {
      process.env.DB_PASSWORD = decodeURIComponent(u.password);
    }
    const dbPath = u.pathname.replace(/^\//, '').split('?')[0];
    if (dbPath && !process.env.DB_NAME) process.env.DB_NAME = dbPath;
  } catch {
    /* ignore malformed DATABASE_URL */
  }
}

applyDatabaseUrlIfNeeded();

if (!process.env.DB_USER || String(process.env.DB_USER).trim() === '') {
  console.warn(
    '[db] DB_USER is empty. Set DB_USER (and DB_PASSWORD) in server/.env, or set DATABASE_URL.',
  );
}

function getSslConfig() {
  const sslMode = (process.env.DB_SSL_MODE || '').toUpperCase();
  if (sslMode === 'OFF' || sslMode === 'DISABLED' || sslMode === 'FALSE') {
    return undefined;
  }
  if (sslMode !== 'REQUIRED') {
    return undefined;
  }

  const caPath = path.join(__dirname, '../../db/ca.pem');

  // אם קיים קובץ CA (db/ca.pem) — אימות מלא של תעודת השרת (מאובטח יותר).
  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true,
    };
  }

  // ללא CA: עדיין מצפינים את החיבור ב-SSL, אך בלי אימות שרשרת התעודה.
  // מתאים ל-Aiven שמשתמשת ב-CA פרטי. להוספת אימות מלא — שמרי את התעודה ב-db/ca.pem.
  return { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: getSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query('SELECT 1 AS ok');
    return rows[0];
  } finally {
    connection.release();
  }
}

export default pool;
