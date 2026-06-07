import nodemailer from 'nodemailer';

// שליחת מיילים דרך SMTP. ההגדרות נטענות ממשתני סביבה (.env):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// אם לא הוגדר SMTP — השליחה מדלגת בשקט (כדי לא להפיל את ההרשמה) ומדפיסה לוג.

let transporter = null;
let initialized = false;

function getTransporter() {
  if (initialized) return transporter;
  initialized = true;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[mailer] SMTP לא הוגדר (.env) — מיילים לא יישלחו.');
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  // ברשתות עם אנטי-וירוס/פרוקסי שמיירטים TLS, אימות התעודה עלול להיכשל.
  // SMTP_TLS_INSECURE=true מאפשר שליחה גם במצב כזה (החיבור עדיין מוצפן).
  const insecureTls = String(process.env.SMTP_TLS_INSECURE).toLowerCase() === 'true';
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(insecureTls ? { tls: { rejectUnauthorized: false } } : {}),
  });
  return transporter;
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) return { skipped: true };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await tx.sendMail({ from, to, subject, text, html });
  return { skipped: false, messageId: info.messageId };
}

export async function sendWelcomeEmail({ to, fullName }) {
  const name = fullName ? fullName.split(' ')[0] : '';
  const subject = 'נרשמת בהצלחה לדירות נופש 🎉';
  const text = `היי ${name},\n\nנרשמת בהצלחה לאתר דירות נופש!\nמעכשיו תוכל/י לפרסם נכסים, לנהל את הדירות שלך ועוד.\n\nבברכה,\nצוות דירות נופש`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="color: #b8860b;">היי ${name}, נרשמת בהצלחה! 🎉</h2>
      <p>ברוכים הבאים לאתר <strong>דירות נופש</strong>.</p>
      <p>מעכשיו תוכל/י לפרסם נכסים, לנהל את הדירות שלך ועוד.</p>
      <p style="margin-top: 24px;">בברכה,<br/>צוות דירות נופש</p>
    </div>`;

  return sendMail({ to, subject, text, html });
}

// מייל למנהל כאשר מתפרסמת דירה חדשה הממתינה לאישור
export async function sendNewListingToAdmin({ to, apartment, publisherName }) {
  const title = apartment.title || 'דירה חדשה';
  const subject = `בקשת פרסום דירה חדשה: ${title}`;
  const details = [
    `כותרת: ${title}`,
    apartment.location ? `אזור: ${apartment.location}` : null,
    apartment.address ? `כתובת: ${apartment.address}` : null,
    apartment.price_per_night ? `מחיר: ₪${apartment.price_per_night}` : null,
    apartment.owner_name ? `איש קשר: ${apartment.owner_name}` : null,
    apartment.owner_phone ? `טלפון: ${apartment.owner_phone}` : null,
    apartment.owner_email ? `אימייל: ${apartment.owner_email}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `היי,\n\n${publisherName || 'משתמש'} רוצה לפרסם דירה חדשה והיא ממתינה לאישורך.\n\n${details}\n\nהיכנס לפאנל הניהול כדי לאשר או לדחות את הדירה.\n\nצוות דירות נופש`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="color: #b8860b;">בקשת פרסום דירה חדשה ⏳</h2>
      <p><strong>${publisherName || 'משתמש'}</strong> רוצה לפרסם דירה חדשה, והיא ממתינה לאישורך.</p>
      <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:14px 18px;margin:16px 0;">
        <p style="margin:0;"><strong>${title}</strong></p>
        ${apartment.location ? `<p style="margin:4px 0;">אזור: ${apartment.location}</p>` : ''}
        ${apartment.address ? `<p style="margin:4px 0;">כתובת: ${apartment.address}</p>` : ''}
        ${apartment.price_per_night ? `<p style="margin:4px 0;">מחיר: ₪${apartment.price_per_night}</p>` : ''}
        ${apartment.owner_name ? `<p style="margin:4px 0;">איש קשר: ${apartment.owner_name}</p>` : ''}
        ${apartment.owner_phone ? `<p style="margin:4px 0;">טלפון: ${apartment.owner_phone}</p>` : ''}
        ${apartment.owner_email ? `<p style="margin:4px 0;">אימייל: ${apartment.owner_email}</p>` : ''}
      </div>
      <p>היכנס/י לפאנל הניהול כדי לאשר או לדחות את הדירה.</p>
      <p style="margin-top: 24px;">צוות דירות נופש</p>
    </div>`;

  return sendMail({ to, subject, text, html });
}

// מייל למפרסם כאשר הדירה שלו אושרה ופורסמה
export async function sendListingApprovedToOwner({ to, apartment, ownerName }) {
  const name = ownerName ? ownerName.split(' ')[0] : '';
  const title = apartment.title || 'הדירה שלך';
  const subject = `הדירה שלך פורסמה בהצלחה: ${title} 🎉`;
  const text = `היי ${name},\n\nשמחים לבשר שהדירה "${title}" אושרה על ידי המנהל והיא מפורסמת עכשיו באתר!\n\nבברכה,\nצוות דירות נופש`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="color: #b8860b;">הדירה שלך פורסמה בהצלחה! 🎉</h2>
      <p>היי ${name},</p>
      <p>שמחים לבשר שהדירה <strong>"${title}"</strong> אושרה על ידי המנהל והיא מפורסמת עכשיו באתר.</p>
      <p style="margin-top: 24px;">בברכה,<br/>צוות דירות נופש</p>
    </div>`;

  return sendMail({ to, subject, text, html });
}
