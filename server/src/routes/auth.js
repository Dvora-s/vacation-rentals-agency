import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { signToken, requireAuth, requireRole } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../utils/mailer.js';

const router = Router();

// סיסמה חזקה: לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    created_at: row.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body || {};
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'שם מלא, אימייל וסיסמה הם שדות חובה' });
    }
    if (!STRONG_PASSWORD.test(password)) {
      return res.status(400).json({
        error:
          'הסיסמה חלשה מדי. חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'משתמש עם האימייל הזה כבר קיים' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, 'owner')`,
      [full_name.trim(), normalizedEmail, phone || null, password_hash],
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = publicUser(rows[0]);
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // שליחת מייל ברוכים-הבאים (best-effort — לא מפיל את ההרשמה אם נכשל)
    sendWelcomeEmail({ to: user.email, fullName: user.full_name }).catch((err) => {
      console.error('[mailer] שליחת מייל ברוכים-הבאים נכשלה:', err.message);
    });

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'נדרשים אימייל וסיסמה' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user: publicUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'המשתמש לא נמצא' });
    }
    res.json(publicUser(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// רשימת כל המשתמשים — למנהל בלבד
router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC',
    );
    res.json(rows.map(publicUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
