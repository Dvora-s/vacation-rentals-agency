import nodemailer from 'nodemailer';

// שליחת מיילים דרך SMTP. ההגדרות נטענות ממשתני סביבה (.env):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// אם לא הוגדר SMTP — השליחה מדלגת בשקט (כדי לא להפיל את הזרימה) ומדפיסה לוג.

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

// ───────────────────────── עזרי תבנית (Layout) ─────────────────────────

const BRAND = 'דירות נופש';
const TAGLINE = 'הדרך הפשוטה לתוספת הכנסה כשהבית פנוי';
const GOLD = '#b8860b';
const NAVY = '#1a2b4a';

function firstName(fullName) {
  return fullName ? String(fullName).trim().split(/\s+/)[0] : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// כפתור CTA במייל
function button(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:10px;background:${GOLD};">
          <a href="${href}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;
                    color:#ffffff;text-decoration:none;border-radius:10px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// מעטפת HTML אחידה לכל המיילים
function layout(innerHtml) {
  return `
  <div dir="rtl" style="margin:0;padding:0;background:#f4f1ea;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;
                line-height:1.7;color:#1a1a1a;">
      <div style="text-align:center;padding:8px 0 20px;">
        <span style="font-size:22px;font-weight:800;color:${NAVY};">🏡 ${BRAND}</span>
      </div>
      <div style="background:#ffffff;border:1px solid #ece6d8;border-radius:16px;
                  padding:28px 26px;box-shadow:0 10px 30px -18px rgba(8,24,40,0.25);">
        ${innerHtml}
      </div>
      <div style="text-align:center;color:#8a8a8a;font-size:12px;padding:18px 8px 4px;">
        <p style="margin:4px 0;font-weight:700;color:${GOLD};">${BRAND}</p>
        <p style="margin:4px 0;">${TAGLINE}</p>
      </div>
    </div>
  </div>`;
}

// ───────────────────────── 1. אימות אימייל ─────────────────────────
export async function sendVerificationEmail({ to, fullName, verifyUrl }) {
  const name = firstName(fullName);
  const subject = 'רק עוד לחיצה אחת... מאמתים את החשבון שלך! 🚀';
  const text = `שלום ${name},

שמחים לצרף אותך לנבחרת המארחים שלנו!

כדי להשלים את התהליך ולהפעיל את החשבון, כל מה שצריך לעשות זה ללחוץ על הקישור הבא:
${verifyUrl}

שים לב: אם קריאת המייל ואימות החשבון מתבצעים ממכשיר שונה מזה שנרשמת בו, תועבר לדף ההתחברות – שם יש להזין מחדש את פרטי הגישה שלך.

${BRAND} – ${TAGLINE}`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">שלום ${escapeHtml(name)},</h2>
    <p style="margin:0 0 10px;">שמחים לצרף אותך לנבחרת המארחים שלנו!</p>
    <p style="margin:0 0 4px;">כדי להשלים את התהליך ולהפעיל את החשבון, כל מה שצריך לעשות זה ללחוץ על הכפתור כאן למטה:</p>
    ${button(verifyUrl, 'אימות האימייל שלי')}
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin-top:8px;">
      <p style="margin:0;font-size:14px;">💡 <strong>שים לב:</strong> אם קריאת המייל ואימות החשבון מתבצעים ממכשיר שונה
      מזה שנרשמת בו, תועבר לדף ההתחברות – שם יש להזין מחדש את פרטי הגישה שלך.</p>
    </div>
    <p style="margin:18px 0 0;font-size:13px;color:#8a8a8a;">אם לא ביקשת להירשם, אפשר להתעלם מהודעה זו.</p>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 2. ברוכים הבאים ─────────────────────────
export async function sendWelcomeEmail({ to, fullName }) {
  void fullName;
  const subject = 'ברוכים הבאים ל"דירות נופש"! 🏡 הדרך הקלה למנף את הבית שלכם';
  const text = `שלום וברכה,

איזה כיף לראות אותך איתנו! שמחים שהצטרפת למשפחת "דירות נופש" – הפלטפורמה שמסייעת לכם לייצר הכנסה נוספת מהנכס שלכם, בקלות ובזמן שהכי נוח לכם.

אנו מאחלים לכם חוויה יעילה, נוחה והרבה הצלחה במינוף הנכס!

בברכה,
צוות "דירות נופש"
Tivuch.shabat@gmail.com`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">שלום וברכה,</h2>
    <p style="margin:0 0 10px;">איזה כיף לראות אותך איתנו! שמחים שהצטרפת למשפחת <strong>"דירות נופש"</strong> –
    הפלטפורמה שמסייעת לכם לייצר הכנסה נוספת מהנכס שלכם, בקלות ובזמן שהכי נוח לכם.</p>
    <p style="margin:0 0 10px;">אנו מאחלים לכם חוויה יעילה, נוחה והרבה הצלחה במינוף הנכס!</p>
    <p style="margin:18px 0 0;">בברכה,<br/>צוות "דירות נופש"<br/>
      <a href="mailto:Tivuch.shabat@gmail.com" style="color:${GOLD};">Tivuch.shabat@gmail.com</a>
    </p>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 3. אישור תשלום/הזמנה ─────────────────────────
export async function sendPaymentReceiptEmail({ to, order }) {
  const {
    number,
    date,
    items = [],
    total,
    paymentMethod = 'תשלום מאובטח בכרטיס אשראי',
    billing = {},
  } = order || {};

  const subject = `אישור קבלת הזמנה מס' ${number} – ${BRAND}`;

  const itemsText = items
    .map((it) => `${it.name} x${it.qty} — ₪${Number(it.price).toFixed(2)}`)
    .join('\n');
  const text = `שלום ${billing.name || ''},

שמחים לעדכן כי הזמנתך מאתר "${BRAND}" התקבלה בהצלחה ומטופלת כעת על ידי הצוות שלנו.

פירוט ההזמנה (מס' ${number}) – ${date}
${itemsText}
סך הכל: ₪${Number(total).toFixed(2)}
אמצעי תשלום: ${paymentMethod}

פרטי חיוב
שם מלא: ${billing.name || ''}
כתובת: ${billing.address || ''}
דוא"ל: ${billing.email || ''}

בברכה,
${BRAND} – ${TAGLINE}`;

  const itemsRows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(it.qty)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:left;">₪${Number(it.price).toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">שלום ${escapeHtml(billing.name || '')},</h2>
    <p style="margin:0 0 10px;">שמחים לעדכן כי הזמנתך מאתר <strong>"${BRAND}"</strong> התקבלה בהצלחה
    ומטופלת כעת על ידי הצוות שלנו.</p>

    <h3 style="margin:18px 0 8px;color:${NAVY};">פירוט ההזמנה (מס' ${escapeHtml(number)}) – ${escapeHtml(date)}</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#faf7ef;">
        <th style="padding:8px 10px;text-align:right;">מוצר</th>
        <th style="padding:8px 10px;text-align:center;">כמות</th>
        <th style="padding:8px 10px;text-align:left;">מחיר</th>
      </tr>
      ${itemsRows}
      <tr>
        <td colspan="2" style="padding:8px 10px;text-align:right;">סכום ביניים:</td>
        <td style="padding:8px 10px;text-align:left;">₪${Number(total).toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:8px 10px;text-align:right;">אמצעי תשלום:</td>
        <td style="padding:8px 10px;text-align:left;">${escapeHtml(paymentMethod)}</td>
      </tr>
      <tr style="font-weight:800;color:${NAVY};">
        <td colspan="2" style="padding:10px;text-align:right;border-top:2px solid #ece6d8;">סך הכל:</td>
        <td style="padding:10px;text-align:left;border-top:2px solid #ece6d8;">₪${Number(total).toFixed(2)}</td>
      </tr>
    </table>

    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin-top:16px;">
      <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">פרטי חיוב</p>
      <p style="margin:2px 0;">שם מלא: ${escapeHtml(billing.name || '')}</p>
      <p style="margin:2px 0;">כתובת: ${escapeHtml(billing.address || '')}</p>
      <p style="margin:2px 0;">דוא"ל: <span dir="ltr">${escapeHtml(billing.email || '')}</span></p>
    </div>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 4. המודעה פורסמה ("גלויה לכולם") ─────────────────────────
export async function sendListingLiveEmail({ to, apartment, listingUrl, editUrl }) {
  const title = apartment?.title || 'הדירה שלך';
  const subject = 'המודעה שלך באתר דירות נופש! ✨';
  const text = `מהרגע זה המודעה שלך גלויה וזמינה לצפייה עבור כולם.

רוצה לראות איך היא נראית?
${listingUrl}

לעריכת פרטי הדירה:
${editUrl}

${BRAND} – ${TAGLINE}`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">המודעה שלך באוויר! ✨</h2>
    <p style="margin:0 0 6px;">מהרגע זה המודעה <strong>"${escapeHtml(title)}"</strong> גלויה וזמינה לצפייה עבור כולם.</p>
    <p style="margin:0 0 4px;">רוצה לראות איך היא נראית?</p>
    ${button(listingUrl, 'צפייה במודעה')}
    <p style="margin:12px 0 4px;">רוצה לעדכן פרטים?</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0;">
      <tr>
        <td style="border-radius:10px;border:2px solid ${GOLD};">
          <a href="${editUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;
                    color:${GOLD};text-decoration:none;">
            עריכת פרטי הדירה
          </a>
        </td>
      </tr>
    </table>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 5. תזכורת פקיעת תוקף ─────────────────────────
export async function sendListingExpiryReminderEmail({ to, fullName, apartment, renewUrl }) {
  const name = firstName(fullName);
  const title = apartment?.title || 'המודעה שלך';
  const subject = 'תוקף המודעה שלך פג? זה הזמן לחדש לקראת תקופת החגים! ⏳';
  const text = `שלום ${name},

מעדכנים כי תוקף הפרסום של המודעה שלך פג, והיא הושעתה זמנית מהאתר עד לחידושה.

"${title}"

תקופת החגים בפתח והביקוש לדירות נופש נמצא בשיאו. כדי להחזיר את המודעה שלך לאוויר בהקדם ולהמשיך לקבל פניות משוכרים, כל מה שצריך זה:
1. לוחצים על הכפתור כאן למטה ומתחברים לחשבון.
2. בעמוד פרטי המודעה, גוללים עד לחלק התחתון של המסך.
3. לוחצים על הכפתור "חדש מודעה".

${renewUrl}

💡 תזכורת: יש ברשותנו מאגר דירות רחב. לקבלת הקטלוג המלא, ניתן תמיד לפנות אלינו במייל הרשמי: office@dira4shabat.co.il

בברכה,
צוות ${BRAND}
${TAGLINE}`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">שלום ${escapeHtml(name)},</h2>
    <p style="margin:0 0 10px;">מעדכנים כי תוקף הפרסום של המודעה שלך פג, והיא הושעתה זמנית מהאתר עד לחידושה.</p>
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin:12px 0;">
      <p style="margin:0;font-weight:700;color:${NAVY};">${escapeHtml(title)}</p>
    </div>
    <p style="margin:0 0 8px;">תקופת החגים בפתח והביקוש לדירות נופש נמצא בשיאו. כדי להחזיר את המודעה שלך
    לאוויר בהקדם ולהמשיך לקבל פניות משוכרים, כל מה שצריך זה לבצע שלושה צעדים פשוטים:</p>
    <ol style="margin:0 0 8px;padding-inline-start:20px;">
      <li>לוחצים על הכפתור כאן למטה ומתחברים לחשבון.</li>
      <li>בעמוד פרטי המודעה, גוללים עד לחלק התחתון של המסך.</li>
      <li>לוחצים על הכפתור "חדש מודעה".</li>
    </ol>
    ${button(renewUrl, 'פרסם לתקופה נוספת')}
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin-top:8px;">
      <p style="margin:0;font-size:14px;">💡 <strong>תזכורת:</strong> יש ברשותנו מאגר דירות רחב.
      לקבלת הקטלוג המלא, ניתן תמיד לפנות אלינו במייל הרשמי:
      <a href="mailto:office@dira4shabat.co.il" style="color:${GOLD};">office@dira4shabat.co.il</a></p>
    </div>
    <p style="margin:18px 0 0;">בברכה,<br/>צוות ${BRAND}</p>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 6א. אישור קבלת פנייה (לפונה) ─────────────────────────
export async function sendContactConfirmationEmail({ to, fullName }) {
  const name = firstName(fullName);
  const subject = 'פנייתך התקבלה במערכת ✉️';
  const text = `שלום ${name},

תודה שפנית אלינו. פנייתך התקבלה במערכת.

אנו עושים את מירב המאמצים כדי להעניק שירות מהיר ומקצועי, ונשתדל לחזור אליך עם מענה מפורט ב-24 השעות הקרובות.

💡 מידע שימושי בזמן ההמתנה: אם פנייתך נוגעת לדירה ספציפית המפורסמת באתר, מומלץ לשלוח הודעה ישירה למארח דרך כפתור "יצירת קשר עם המפרסם" בגוף המודעה לקבלת מענה מהיר.

בברכה,
צוות ${BRAND}
${TAGLINE}`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">שלום ${escapeHtml(name)},</h2>
    <p style="margin:0 0 10px;">תודה שפנית אלינו. פנייתך התקבלה במערכת.</p>
    <p style="margin:0 0 10px;">אנו עושים את מירב המאמצים כדי להעניק שירות מהיר ומקצועי,
    ונשתדל לחזור אליך עם מענה מפורט ב-24 השעות הקרובות.</p>
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin-top:8px;">
      <p style="margin:0;font-size:14px;">💡 <strong>מידע שימושי בזמן ההמתנה:</strong> אם פנייתך נוגעת לדירה
      ספציפית המפורסמת באתר, מומלץ לשלוח הודעה ישירה למארח דרך כפתור "יצירת קשר עם המפרסם"
      בגוף המודעה לקבלת מענה מהיר.</p>
    </div>
    <p style="margin:18px 0 0;">בברכה,<br/>צוות ${BRAND}</p>
  `);

  return sendMail({ to, subject, text, html });
}

// ───────────────────────── 6ב. פנייה חדשה (למנהל) ─────────────────────────
export async function sendContactToAdmin({ to, contact }) {
  const { full_name, email, phone, message } = contact || {};
  const subject = `📩 פנייה חדשה מ${full_name || 'מבקר באתר'} – ${BRAND}`;
  const text = `התקבלה פנייה חדשה דרך טופס "צור קשר":

שם: ${full_name || ''}
אימייל: ${email || ''}
טלפון: ${phone || 'לא צוין'}

הודעה:
${message || ''}`;

  const html = layout(`
    <h2 style="margin:0 0 12px;color:${NAVY};">📩 פנייה חדשה מטופס "צור קשר"</h2>
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:12px 16px;margin:12px 0;">
      <p style="margin:2px 0;"><strong>שם:</strong> ${escapeHtml(full_name || '')}</p>
      <p style="margin:2px 0;"><strong>אימייל:</strong> <span dir="ltr">${escapeHtml(email || '')}</span></p>
      <p style="margin:2px 0;"><strong>טלפון:</strong> <span dir="ltr">${escapeHtml(phone || 'לא צוין')}</span></p>
    </div>
    <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">הודעה:</p>
    <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message || '')}</p>
  `);

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

  const text = `היי,\n\n${publisherName || 'משתמש'} רוצה לפרסם דירה חדשה והיא ממתינה לאישורך.\n\n${details}\n\nהיכנס לפאנל הניהול כדי לאשר או לדחות את הדירה.\n\nצוות ${BRAND}`;
  const html = layout(`
    <h2 style="margin:0 0 12px;color:${GOLD};">בקשת פרסום דירה חדשה ⏳</h2>
    <p style="margin:0 0 10px;"><strong>${escapeHtml(publisherName || 'משתמש')}</strong> רוצה לפרסם דירה חדשה, והיא ממתינה לאישורך.</p>
    <div style="background:#faf7ef;border:1px solid #efe7d2;border-radius:10px;padding:14px 18px;margin:16px 0;">
      <p style="margin:0;"><strong>${escapeHtml(title)}</strong></p>
      ${apartment.location ? `<p style="margin:4px 0;">אזור: ${escapeHtml(apartment.location)}</p>` : ''}
      ${apartment.address ? `<p style="margin:4px 0;">כתובת: ${escapeHtml(apartment.address)}</p>` : ''}
      ${apartment.price_per_night ? `<p style="margin:4px 0;">מחיר: ₪${escapeHtml(apartment.price_per_night)}</p>` : ''}
      ${apartment.owner_name ? `<p style="margin:4px 0;">איש קשר: ${escapeHtml(apartment.owner_name)}</p>` : ''}
      ${apartment.owner_phone ? `<p style="margin:4px 0;">טלפון: ${escapeHtml(apartment.owner_phone)}</p>` : ''}
      ${apartment.owner_email ? `<p style="margin:4px 0;">אימייל: ${escapeHtml(apartment.owner_email)}</p>` : ''}
    </div>
    <p style="margin:0;">היכנס/י לפאנל הניהול כדי לאשר או לדחות את הדירה.</p>
  `);

  return sendMail({ to, subject, text, html });
}
