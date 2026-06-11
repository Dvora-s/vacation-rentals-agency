import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import pool from '../config/db.js';
import {
  signToken,
  signEmailToken,
  verifyEmailToken,
  signResetToken,
  verifyResetToken,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/mailer.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

// מחזיר שגיאת שרת גנרית ללקוח (בלי לחשוף פרטים פנימיים) ומתעד את התקלה בצד השרת.
function serverError(res, error, context) {
  logger.error(`[auth] ${context}:`, error);
  res.status(500).json({ error: 'אירעה שגיאה בשרת. נסו שוב מאוחר יותר.' });
}

// סיסמה חזקה: לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    email_verified: !!row.email_verified,
    auth_provider: row.auth_provider || 'local',
    created_at: row.created_at,
  };
}

// בונה קישור אימות ושולח את מייל האימות (best-effort).
async function sendVerification(user) {
  const token = signEmailToken({ id: user.id, email: user.email });
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail({ to: user.email, fullName: user.full_name, verifyUrl });
}

router.post('/register', authLimiter, async (req, res) => {
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
      `INSERT INTO users (full_name, email, phone, password_hash, role, email_verified, auth_provider)
       VALUES (?, ?, ?, ?, 'owner', 0, 'local')`,
      [full_name.trim(), normalizedEmail, phone || null, password_hash],
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = publicUser(rows[0]);

    // שולחים מייל אימות. ההרשמה מסתיימת רק לאחר אימות — לא מחזירים טוקן התחברות.
    try {
      await sendVerification(user);
    } catch (err) {
      console.error('[mailer] שליחת מייל אימות נכשלה:', err.message);
    }

    res.status(201).json({
      pending_verification: true,
      email: user.email,
      message: 'נשלח אליך מייל לאימות החשבון. יש ללחוץ על הקישור שבמייל כדי להפעיל את החשבון.',
    });
  } catch (error) {
    serverError(res, error, 'register');
  }
});

// אימות אימייל לפי טוקן — מפעיל את החשבון ושולח מייל ברוכים-הבאים.
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ error: 'חסר טוקן אימות' });
    }

    let decoded;
    try {
      decoded = verifyEmailToken(token);
    } catch {
      return res.status(400).json({ error: 'קישור האימות אינו תקין או שפג תוקפו' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'המשתמש לא נמצא' });
    }
    const user = rows[0];

    const wasVerified = !!user.email_verified;
    if (!wasVerified) {
      await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);
      // מייל ברוכים-הבאים נשלח פעם אחת, לאחר אימות מוצלח (best-effort)
      sendWelcomeEmail({ to: user.email, fullName: user.full_name }).catch((err) =>
        console.error('[mailer] מייל ברוכים-הבאים נכשל:', err.message),
      );
    }
    user.email_verified = 1;

    // מנפיקים טוקן התחברות כדי שהמשתמש יחובר אוטומטית מיד לאחר האימות.
    const authToken = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      ok: true,
      email: user.email,
      already_verified: wasVerified,
      user: publicUser(user),
      token: authToken,
    });
  } catch (error) {
    serverError(res, error, 'verify-email');
  }
});

// שליחה חוזרת של מייל אימות.
router.post('/resend-verification', sensitiveLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'נדרש אימייל' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    // לא חושפים אם המשתמש קיים — מחזירים תמיד הצלחה.
    if (rows.length > 0 && !rows[0].email_verified) {
      try {
        await sendVerification(publicUser(rows[0]));
      } catch (err) {
        console.error('[mailer] שליחה חוזרת של מייל אימות נכשלה:', err.message);
      }
    }
    res.json({ ok: true, message: 'אם קיים חשבון שאינו מאומת, נשלח אליו מייל אימות חדש.' });
  } catch (error) {
    serverError(res, error, 'resend-verification');
  }
});

// "טביעת אצבע" של הסיסמה הנוכחית — משובצת בטוקן האיפוס כדי שהקישור יהפוך לחד-פעמי
// (לאחר שינוי הסיסמה, ה-hash משתנה והטוקן הישן כבר אינו תקף).
function passwordFingerprint(passwordHash) {
  return String(passwordHash || '').slice(-12);
}

// שלב 1: בקשת איפוס סיסמה — שולח מייל עם קישור (תמיד מחזיר הצלחה כדי לא לחשוף קיום משתמש).
router.post('/forgot-password', sensitiveLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'נדרש אימייל' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    // שולחים מייל רק אם קיים חשבון עם סיסמה (לא חשבון גוגל בלבד).
    if (user && user.password_hash) {
      const token = signResetToken({
        id: user.id,
        email: user.email,
        fp: passwordFingerprint(user.password_hash),
      });
      const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.full_name,
          resetUrl,
        });
      } catch (err) {
        console.error('[mailer] שליחת מייל איפוס סיסמה נכשלה:', err.message);
      }
    }

    res.json({
      ok: true,
      message: 'אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה.',
    });
  } catch (error) {
    serverError(res, error, 'forgot-password');
  }
});

// שלב 2: איפוס בפועל — מקבל token + סיסמה חדשה, מעדכן את הסיסמה.
router.post('/reset-password', sensitiveLimiter, async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'נדרשים טוקן וסיסמה חדשה' });
    }
    if (!STRONG_PASSWORD.test(password)) {
      return res.status(400).json({
        error:
          'הסיסמה חלשה מדי. חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.',
      });
    }

    let decoded;
    try {
      decoded = verifyResetToken(token);
    } catch {
      return res.status(400).json({ error: 'קישור האיפוס אינו תקין או שפג תוקפו' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'המשתמש לא נמצא' });
    }
    const user = rows[0];

    // קישור חד-פעמי: אם הסיסמה כבר שונתה מאז שהונפק הטוקן — הוא אינו תקף עוד.
    if (decoded.fp !== passwordFingerprint(user.password_hash)) {
      return res.status(400).json({ error: 'קישור האיפוס כבר נוצל או שאינו תקף עוד' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    // איפוס סיסמה מהמייל מאשר גם בעלות על תיבת הדואר — מסמנים כמאומת.
    await pool.query('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [
      password_hash,
      user.id,
    ]);

    res.json({ ok: true, message: 'הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.' });
  } catch (error) {
    serverError(res, error, 'reset-password');
  }
});

router.post('/login', authLimiter, async (req, res) => {
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

    // משתמש שנרשם דרך גוגל ואין לו סיסמה
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'החשבון נוצר באמצעות התחברות עם גוגל. יש להתחבר דרך כפתור "התחברות עם Google".',
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // מנהל פטור מאימות מייל — מתחבר עם שם משתמש/אימייל וסיסמה בלבד.
    if (!user.email_verified && user.role !== 'admin') {
      return res.status(403).json({
        error: 'החשבון עדיין לא אומת. נשלח אליך מייל אימות — יש ללחוץ על הקישור שבו.',
        needs_verification: true,
        email: user.email,
      });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user: publicUser(user), token });
  } catch (error) {
    serverError(res, error, 'login');
  }
});

// התחברות/הרשמה דרך גוגל. מקבל credential (ID token) מצד הלקוח.
router.post('/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ error: 'התחברות עם גוגל אינה מוגדרת בשרת.' });
    }
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'חסר אסימון התחברות מגוגל' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'אימות מול גוגל נכשל' });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: 'חשבון הגוגל אינו כולל אימייל מאומת' });
    }

    const email = payload.email.trim().toLowerCase();
    const fullName = payload.name || email.split('@')[0];
    const googleId = payload.sub;

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    let userRow;
    let isNew = false;
    if (existing.length > 0) {
      userRow = existing[0];
      // מקשר את החשבון לגוגל ומוודא שהוא מאומת
      await pool.query(
        `UPDATE users
         SET google_id = COALESCE(google_id, ?),
             email_verified = 1,
             auth_provider = IF(auth_provider = 'local' AND password_hash IS NOT NULL, auth_provider, 'google')
         WHERE id = ?`,
        [googleId, userRow.id],
      );
    } else {
      isNew = true;
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, email_verified, auth_provider, google_id)
         VALUES (?, ?, NULL, NULL, 'owner', 1, 'google', ?)`,
        [fullName, email, googleId],
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      userRow = rows[0];
    }

    if (isNew) {
      sendWelcomeEmail({ to: email, fullName }).catch((err) =>
        console.error('[mailer] מייל ברוכים-הבאים (גוגל) נכשל:', err.message),
      );
    }

    const token = signToken({ id: userRow.id, email: userRow.email, role: userRow.role });
    res.json({ user: publicUser(userRow), token });
  } catch (error) {
    serverError(res, error, 'google');
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
    serverError(res, error, 'me');
  }
});

// רשימת כל המשתמשים — למנהל בלבד
router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, email_verified, auth_provider, created_at FROM users ORDER BY created_at DESC',
    );
    res.json(rows.map(publicUser));
  } catch (error) {
    serverError(res, error, 'list-users');
  }
});

export default router;
