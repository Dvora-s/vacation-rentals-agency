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

// תזכורות נשלחות בשני שלבים, ומנוהלות דרך העמודה expiry_reminder_sent:
//   0 = טרם נשלחה תזכורת | 1 = נשלחה תזכורת ראשונה (7 ימים) | 2 = נשלחה תזכורת אחרונה (יום לפני)
const FIRST_REMINDER_DAYS = Number(process.env.EXPIRY_REMINDER_DAYS) || 7;
const FINAL_REMINDER_DAYS = Number(process.env.EXPIRY_FINAL_REMINDER_DAYS) || 1;

// מספר הימים שנותרו עד הפקיעה (מעוגל כלפי מעלה, מינימום 0).
function daysUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function formatHebrewDate(date) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

async function sendReminderFor(apt, stageValue) {
  const owner = resolveOwner(apt);
  if (owner.email) {
    try {
      await sendListingExpiryReminderEmail({
        to: owner.email,
        fullName: owner.name,
        apartment: apt,
        renewUrl: `${APP_URL}/my-apartments/${apt.id}/renew`,
        expiryDate: formatHebrewDate(apt.expires_at),
        daysLeft: daysUntil(apt.expires_at),
      });
    } catch (err) {
      console.error(`[expiry] שליחת תזכורת למודעה ${apt.id} נכשלה:`, err.message);
    }
  }
  await pool.query('UPDATE apartments SET expiry_reminder_sent = ? WHERE id = ?', [
    stageValue,
    apt.id,
  ]);
}

// שלב התזכורת — מחזיר את המודעות הזכאיות לפי טווח ימים ושלב נוכחי.
async function findReminderTargets({ withinDays, currentStage }) {
  const [rows] = await pool.query(
    `SELECT a.*, u.email AS user_email, u.full_name AS user_full_name
     FROM apartments a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.status = 'approved'
       AND a.expiry_reminder_sent = ?
       AND a.expires_at IS NOT NULL
       AND a.expires_at > NOW()
       AND a.expires_at <= (NOW() + INTERVAL ? DAY)`,
    [currentStage, withinDays],
  );
  return rows;
}

// 1) תזכורת אחרונה (יום לפני) — רק למי שכבר קיבל את התזכורת הראשונה (stage 1 -> 2).
async function sendFinalReminders() {
  const rows = await findReminderTargets({ withinDays: FINAL_REMINDER_DAYS, currentStage: 1 });
  for (const apt of rows) await sendReminderFor(apt, 2);
  return rows.length;
}

// 2) תזכורת ראשונה (7 ימים) — למי שעדיין לא קיבל תזכורת (stage 0 -> 1).
async function sendFirstReminders() {
  const rows = await findReminderTargets({ withinDays: FIRST_REMINDER_DAYS, currentStage: 0 });
  for (const apt of rows) await sendReminderFor(apt, 1);
  return rows.length;
}

// 3) מוריד מהאתר מודעות שפג תוקפן (status -> 'expired').
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
    // התזכורת האחרונה נבדקת לפני הראשונה כדי למנוע שליחה כפולה באותה ריצה.
    const finalReminded = await sendFinalReminders();
    const firstReminded = await sendFirstReminders();
    const suspended = await suspendExpired();
    if (firstReminded || finalReminded || suspended) {
      console.log(
        `[expiry] תזכורת ראשונה: ${firstReminded}, תזכורת אחרונה: ${finalReminded}, הושעו: ${suspended}`,
      );
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
