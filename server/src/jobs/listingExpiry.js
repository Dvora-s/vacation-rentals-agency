import cron from 'node-cron';
import pool from '../config/db.js';
import { sendListingExpiryReminderEmail } from '../utils/mailer.js';

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

// מאתר את כתובת המייל והשם של בעל המודעה (מהמשתמש או משדות הדירה).
function resolveOwner(apt) {
  return {
    email: apt.owner_email || apt.user_email || null,
    name: apt.owner_name || apt.user_full_name || '',
  };
}

// כמה ימים לפני פקיעת התוקף לשלוח את התזכורת (ניתן לשינוי דרך .env).
const REMINDER_DAYS_BEFORE = Number(process.env.EXPIRY_REMINDER_DAYS) || 3;

// 1) שולח תזכורת על מודעות שתוקפן יפוג בימים הקרובים (פעם אחת).
async function sendUpcomingReminders() {
  const [rows] = await pool.query(
    `SELECT a.*, u.email AS user_email, u.full_name AS user_full_name
     FROM apartments a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.status = 'approved'
       AND a.expiry_reminder_sent = 0
       AND a.expires_at IS NOT NULL
       AND a.expires_at <= (NOW() + INTERVAL ? DAY)`,
    [REMINDER_DAYS_BEFORE],
  );

  for (const apt of rows) {
    const owner = resolveOwner(apt);
    if (owner.email) {
      try {
        await sendListingExpiryReminderEmail({
          to: owner.email,
          fullName: owner.name,
          apartment: apt,
          renewUrl: `${APP_URL}/my-apartments/${apt.id}/renew`,
        });
      } catch (err) {
        console.error(`[expiry] שליחת תזכורת למודעה ${apt.id} נכשלה:`, err.message);
      }
    }
    await pool.query('UPDATE apartments SET expiry_reminder_sent = 1 WHERE id = ?', [apt.id]);
  }
  return rows.length;
}

// 2) מוריד מהאתר מודעות שפג תוקפן (status -> 'expired').
async function suspendExpired() {
  const [result] = await pool.query(
    `UPDATE apartments
     SET status = 'expired'
     WHERE status = 'approved'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()`,
  );
  return result.affectedRows || 0;
}

export async function runExpiryCheck() {
  try {
    const reminded = await sendUpcomingReminders();
    const suspended = await suspendExpired();
    if (reminded || suspended) {
      console.log(`[expiry] תזכורות שנשלחו: ${reminded}, מודעות שהושעו: ${suspended}`);
    }
  } catch (err) {
    console.error('[expiry] בדיקת תוקף מודעות נכשלה:', err.message);
  }
}

// מתזמן הרצה יומית ב-09:00 (שעון השרת) + הרצה אחת זמן קצר לאחר העלייה.
export function startListingExpiryJob() {
  cron.schedule('0 9 * * *', runExpiryCheck);
  setTimeout(runExpiryCheck, 15000);
  console.log('[expiry] תזמון בדיקת תוקף מודעות הופעל (יומי 09:00).');
}
