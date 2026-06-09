import { Router } from 'express';
import pool from '../config/db.js';
import { sendContactToAdmin, sendContactConfirmationEmail } from '../utils/mailer.js';

const router = Router();

function getAdminNotifyEmails() {
  const raw = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, message } = req.body || {};

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
        `INSERT INTO contact_messages (full_name, email, phone, message)
         VALUES (?, ?, ?, ?)`,
        [contact.full_name, contact.email, contact.phone, contact.message],
      );
    } catch {
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

export default router;
