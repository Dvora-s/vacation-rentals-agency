import { Router } from 'express';
import pool from '../config/db.js';
import { sendContactToAdmin, sendContactConfirmationEmail } from '../utils/mailer.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

function getAdminNotifyEmails() {
  const raw = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { full_name, email, phone, message } = req.body || {};
    // אם המשתמש מחובר — משייכים את הפנייה לחשבון שלו כדי שתופיע ב"אזור האישי".
    const userId = req.user?.id || null;

    if (!full_name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'שם, אימייל והודעה הם שדות חובה' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
    }

    if (String(message).trim().length < 10) {
      return res.status(400).json({ error: 'ההודעה קצרה מדי' });
    }

    const contact = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message.trim(),
    };

    // שמירת הפנייה ב-DB (אם הטבלה קיימת)
    try {
      await pool.query(
        `INSERT INTO contact_messages (full_name, email, phone, message, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [contact.full_name, contact.email, contact.phone, contact.message, userId],
      );
    } catch (err) {
      // ייתכן שעמודת user_id עדיין לא קיימת (לפני מיגרציה) — ננסה בלעדיה.
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await pool.query(
            `INSERT INTO contact_messages (full_name, email, phone, message)
             VALUES (?, ?, ?, ?)`,
            [contact.full_name, contact.email, contact.phone, contact.message],
          );
        } catch {
          /* table may not exist yet — לא קריטי */
        }
      }
      /* table may not exist yet — לא קריטי */
    }

    // מייל למנהל עם הפנייה + מייל אישור לפונה (best-effort, לא חוסם)
    (async () => {
      try {
        const adminEmails = getAdminNotifyEmails();
        if (adminEmails.length > 0) {
          await sendContactToAdmin({ to: adminEmails.join(', '), contact });
        }
      } catch (err) {
        console.error('[mailer] מייל פנייה למנהל נכשל:', err.message);
      }
      try {
        await sendContactConfirmationEmail({ to: contact.email, fullName: contact.full_name });
      } catch (err) {
        console.error('[mailer] מייל אישור פנייה לפונה נכשל:', err.message);
      }
    })();

    res.status(201).json({ ok: true, message: 'ההודעה נשלחה בהצלחה' });
  } catch (error) {
    console.error('[Contact] error:', error.message);
    res.status(500).json({ error: 'שליחת ההודעה נכשלה' });
  }
});

// הפניות של המשתמש המחובר — לפי user_id וגם לפי האימייל שלו (כדי לכלול פניות
// שנשלחו לפני שהמערכת קישרה פניות לחשבון).
router.get('/mine', requireAuth, async (req, res) => {
  const email = (req.user.email || '').toLowerCase();
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, message, created_at
       FROM contact_messages
       WHERE user_id = ? OR LOWER(email) = ?
       ORDER BY created_at DESC`,
      [req.user.id, email],
    );
    return res.json(rows);
  } catch (error) {
    // הטבלה עדיין לא קיימת — אין פניות להציג.
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    // עמודת user_id עדיין לא קיימת (מסד נתונים לפני מיגרציה) — נשלוף לפי האימייל בלבד,
    // כך שהפניות עדיין יופיעו ב"אזור האישי" גם אם לא שויכו ל-user_id.
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [rows] = await pool.query(
          `SELECT id, full_name, email, phone, message, created_at
           FROM contact_messages
           WHERE LOWER(email) = ?
           ORDER BY created_at DESC`,
          [email],
        );
        return res.json(rows);
      } catch (fallbackErr) {
        if (fallbackErr.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        console.error('[Contact/mine] fallback error:', fallbackErr.message);
        return res.status(500).json({ error: 'טעינת הפניות נכשלה' });
      }
    }
    console.error('[Contact/mine] error:', error.message);
    return res.status(500).json({ error: 'טעינת הפניות נכשלה' });
  }
});

export default router;
