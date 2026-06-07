import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('[Auth] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin bootstrap');
    return;
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES (?, ?, NULL, ?, 'admin')`,
    ['מנהל המערכת', email, password_hash],
  );

  console.log(`[Auth] Admin user created: ${email}`);
}
