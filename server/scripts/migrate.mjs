// מיגרציה אידמפוטנטית למסד נתונים קיים — מוסיפה עמודות/טבלאות חדשות
// עבור: אימות אימייל, התחברות גוגל, תוקף מודעה, וטבלת פניות.
// הרצה:  node scripts/migrate.mjs
// בטוח להריץ כמה פעמים — מדלג על שינויים שכבר בוצעו.

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const dbDir = path.join(serverRoot, '../db');

dotenv.config({ path: path.join(serverRoot, '.env') });
const envLocalPath = path.join(serverRoot, '.env.local');
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

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [process.env.DB_NAME, table, column],
  );
  return rows[0].n > 0;
}

async function addColumn(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`  • ${table}.${column} כבר קיים — דילוג`);
    return;
  }
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  ✓ נוסף ${table}.${column}`);
}

async function run() {
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
    console.log('\n[users]');
    await addColumn(conn, 'users', 'email_verified', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumn(conn, 'users', 'auth_provider', "VARCHAR(20) NOT NULL DEFAULT 'local'");
    await addColumn(conn, 'users', 'google_id', 'VARCHAR(255) NULL');
    // password_hash צריך להיות nullable עבור משתמשי גוגל
    await conn.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL');
    console.log('  ✓ password_hash הפך ל-NULL-able');
    // משתמשים קיימים נחשבים מאומתים כדי שלא ינעלו מחוץ לחשבון
    const [upd] = await conn.query('UPDATE users SET email_verified = 1 WHERE email_verified = 0');
    console.log(`  ✓ סומנו ${upd.affectedRows} משתמשים קיימים כמאומתים`);

    console.log('\n[apartments]');
    await addColumn(conn, 'apartments', 'expires_at', 'DATETIME NULL');
    await addColumn(conn, 'apartments', 'expiry_reminder_sent', 'TINYINT(1) NOT NULL DEFAULT 0');
    // הוספת ערך 'expired' ל-enum הסטטוס
    await conn.query(
      `ALTER TABLE apartments
       MODIFY COLUMN status ENUM('pending','approved','rejected','expired')
       NOT NULL DEFAULT 'pending'`,
    );
    console.log("  ✓ סטטוס מודעה תומך עכשיו ב-'expired'");
    // אינדקס על expires_at (אם לא קיים)
    try {
      await conn.query('ALTER TABLE apartments ADD INDEX idx_apartments_expires (expires_at)');
      console.log('  ✓ נוסף אינדקס idx_apartments_expires');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') console.log('  • אינדקס idx_apartments_expires כבר קיים — דילוג');
      else throw err;
    }

    console.log('\n[contact_messages]');
    await conn.query(
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    );
    console.log('  ✓ טבלת contact_messages קיימת');

    console.log('\nDone ✅');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('MIGRATION FAILED:', err.code || '', err.message);
  process.exit(1);
});
