import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

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

    // Log for now — can be extended to email/DB storage later
    console.log('\n--- [Contact form] ---');
    console.log(`Name: ${full_name}`);
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phone || 'N/A'}`);
    console.log(`Message: ${message}`);
    console.log('---\n');

    // Optional: persist if contact_messages table exists
    try {
      await pool.query(
        `INSERT INTO contact_messages (full_name, email, phone, message)
         VALUES (?, ?, ?, ?)`,
        [full_name.trim(), email.trim().toLowerCase(), phone?.trim() || null, message.trim()],
      );
    } catch {
      /* table may not exist yet — logging is sufficient */
    }

    res.status(201).json({ ok: true, message: 'ההודעה נשלחה בהצלחה' });
  } catch (error) {
    console.error('[Contact] error:', error.message);
    res.status(500).json({ error: 'שליחת ההודעה נכשלה' });
  }
});

export default router;
