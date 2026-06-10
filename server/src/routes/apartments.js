import { Router } from 'express';
import pool from '../config/db.js';
import {
  APARTMENT_EDITABLE_FIELDS,
  attachImagesToApartment,
  attachImagesToApartments,
} from '../utils/mapApartment.js';
import {
  requireAuth,
  requireRole,
  optionalAuth,
  signApproveToken,
  verifyApproveToken,
} from '../middleware/auth.js';
import {
  sendNewListingToAdmin,
  sendListingLiveEmail,
  sendListingInquiryEmail,
} from '../utils/mailer.js';

const router = Router();

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
// בסיס ה-API לבניית קישורים בתוך מיילים (קישור אישור בקליק).
// בפרודקשן ה-/api ממופה לשרת; בפיתוח Vite ממפה /api ל-localhost:5000.
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || `${APP_URL}/api`).replace(/\/$/, '');

// הופך כתובת תמונה יחסית לכתובת מלאה (לתצוגה במיילים).
function absoluteImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${APP_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// מאתר את פרטי הקשר של בעל הנכס (מהמודעה או מחשבון המשתמש).
async function resolveOwnerContact(apt) {
  let ownerEmail = apt.owner_email || null;
  let ownerName = apt.owner_name || null;
  if (apt.owner_id) {
    const [u] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [apt.owner_id]);
    if (u[0]) {
      ownerEmail = ownerEmail || u[0].email;
      ownerName = ownerName || u[0].full_name;
    }
  }
  return { ownerEmail, ownerName };
}

// מחזיר את כתובות המייל לקבלת התראות מנהל.
// עדיפות ל-ADMIN_NOTIFY_EMAIL (.env). אחרת — מיילים אמיתיים של מנהלים מה-DB
// (מתעלם מכתובות placeholder כמו admin@nofesh.local שאי אפשר לשלוח אליהן).
async function getAdminEmails() {
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    return process.env.ADMIN_NOTIFY_EMAIL.split(',').map((e) => e.trim()).filter(Boolean);
  }
  const [rows] = await pool.query("SELECT email FROM users WHERE role = 'admin'");
  return rows
    .map((r) => r.email)
    .filter(Boolean)
    .filter((email) => !email.endsWith('.local'));
}

// ─────────────────────────────────────────────
// רישום ציבורי — מציג רק דירות שאושרו על ידי המנהל.
// ─────────────────────────────────────────────
router.get('/', optionalAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM apartments
       WHERE status = 'approved'
       ORDER BY id ASC`,
    );
    const apartments = await attachImagesToApartments(pool, rows);
    res.json(apartments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// "הדירות שלי" — דורש משתמש מחובר.
// ─────────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM apartments WHERE owner_id = ? ORDER BY id DESC',
      [req.user.id],
    );
    res.json(await attachImagesToApartments(pool, rows));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// תור אישור — מנהל בלבד.
// ─────────────────────────────────────────────
router.get('/pending', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM apartments WHERE status = 'pending' ORDER BY created_at ASC",
    );
    res.json(await attachImagesToApartments(pool, rows));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// פרטי דירה
// ─────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    const apt = rows[0];

    if (apt.status !== 'approved') {
      const isOwner = req.user && apt.owner_id && req.user.id === apt.owner_id;
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'דירה לא נמצאה' });
      }
    }

    const apartment = await attachImagesToApartment(pool, apt);
    const { ownerEmail } = await resolveOwnerContact(apt);
    // האם ניתן לשלוח הודעה במייל דרך הטופס (מודעה מאושרת + לבעלים יש מייל).
    apartment.can_inquire = apt.status === 'approved' && !!ownerEmail;
    res.json(apartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// פנייה ישירה מהמודעה — ציבורי (גם ללא התחברות).
// הפונה ממלא מייל + הודעה, ובעל הנכס מקבל מייל עם reply-to לכתובת הפונה.
// ─────────────────────────────────────────────
router.post('/:id/inquiry', async (req, res) => {
  try {
    const { email, message } = req.body || {};

    if (!email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'יש למלא כתובת מייל ותוכן הודעה' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
    }
    if (String(message).trim().length < 10) {
      return res.status(400).json({ error: 'ההודעה קצרה מדי' });
    }

    const aptId = Number(req.params.id);
    if (!Number.isFinite(aptId) || aptId <= 0) {
      return res.status(400).json({ error: 'מזהה דירה לא תקין' });
    }

    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [aptId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    const apt = rows[0];

    if (apt.status !== 'approved') {
      return res.status(400).json({
        error: 'ניתן לשלוח הודעה רק למודעות שאושרו ופורסמו באתר',
      });
    }

    const { ownerEmail, ownerName } = await resolveOwnerContact(apt);

    if (!ownerEmail) {
      return res.status(422).json({
        error: 'לבעל הנכס אין כתובת מייל במערכת. נסו ליצור קשר בטלפון או בוואטסאפ',
      });
    }

    const senderEmail = email.trim().toLowerCase();
    try {
      await sendListingInquiryEmail({
        to: ownerEmail,
        ownerName,
        apartment: apt,
        senderEmail,
        message: message.trim(),
        listingUrl: `${APP_URL}/apartments/${apt.id}`,
      });
    } catch (err) {
      console.error('[mailer] מייל פנייה לבעל הנכס נכשל:', err.message);
      return res.status(502).json({ error: 'שליחת ההודעה נכשלה. נסו שוב מאוחר יותר.' });
    }

    res.status(201).json({ ok: true, message: 'ההודעה נשלחה לבעל הנכס בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// יצירת דירה חדשה — דורש משתמש מחובר. נשמרת כ-pending.
// תומך ב-images: [url, url, ...] שיוזרקו ל-apartment_images.
// ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};

    const required = ['title', 'location', 'price_per_night'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return res.status(400).json({ error: `השדה "${field}" חובה` });
      }
    }

    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const coverImage = body.image_url || images[0] || null;

    const [result] = await pool.query(
      `INSERT INTO apartments
        (owner_id, title, description, location, address, property_type, rental_period,
         price_per_night, bedrooms, bathrooms, max_guests, rating, image_url,
         owner_name, owner_phone, owner_email, contact_via_whatsapp,
         is_available, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        body.title,
        body.description || null,
        body.location,
        body.address || null,
        body.property_type || 'דירה',
        body.rental_period || 'כל השנה',
        Number(body.price_per_night),
        Number(body.bedrooms) || 1,
        Number(body.bathrooms) || 1,
        Number(body.max_guests) || 2,
        4.5,
        coverImage,
        body.owner_name || null,
        body.owner_phone || null,
        body.owner_email || null,
        body.contact_via_whatsapp ? 1 : 0,
        body.is_available === false ? 0 : 1,
      ],
    );

    if (images.length > 0) {
      const values = images.map((url, idx) => [result.insertId, url, idx]);
      await pool.query(
        'INSERT INTO apartment_images (apartment_id, image_url, sort_order) VALUES ?',
        [values],
      );
    }

    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [result.insertId]);
    const apartment = await attachImagesToApartment(pool, rows[0]);

    // התראה למנהל על דירה חדשה הממתינה לאישור (best-effort)
    (async () => {
      try {
        const adminEmails = await getAdminEmails();
        if (adminEmails.length === 0) return;

        let publisherName = body.owner_name || null;
        let publisherEmail = body.owner_email || null;
        let publisherPhone = body.owner_phone || null;
        if (!publisherName || !publisherEmail) {
          const [u] = await pool.query(
            'SELECT full_name, email, phone FROM users WHERE id = ?',
            [req.user.id],
          );
          publisherName = publisherName || u[0]?.full_name || req.user.email;
          publisherEmail = publisherEmail || u[0]?.email || req.user.email;
          publisherPhone = publisherPhone || u[0]?.phone || null;
        }

        // קישור אישור בקליק (טוקן חתום) + קישור לפאנל הניהול
        const approveToken = signApproveToken({ id: apartment.id });
        const approveUrl = `${PUBLIC_API_URL}/apartments/${apartment.id}/email-approve?token=${encodeURIComponent(approveToken)}`;
        const adminPanelUrl = `${APP_URL}/admin`;

        const emailApartment = {
          ...apartment,
          images: (apartment.images || []).map(absoluteImageUrl).filter(Boolean),
        };

        await sendNewListingToAdmin({
          to: adminEmails.join(', '),
          apartment: emailApartment,
          publisherName,
          publisherPhone,
          publisherEmail,
          approveUrl,
          adminPanelUrl,
        });
      } catch (err) {
        console.error('[mailer] התראת דירה חדשה למנהל נכשלה:', err.message);
      }
    })();

    res.status(201).json(apartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function loadOwnedApartment(req, res) {
  const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'דירה לא נמצאה' });
    return null;
  }
  const apt = rows[0];
  const isAdmin = req.user.role === 'admin';
  const isOwner = apt.owner_id === req.user.id;
  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: 'אין הרשאה לערוך את הדירה' });
    return null;
  }
  return apt;
}

// ─────────────────────────────────────────────
// עדכון דירה — בעלים/אדמין. images יכול להגיע ויחליף את הגלריה הקיימת.
// ─────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const apt = await loadOwnedApartment(req, res);
    if (!apt) return;

    const body = req.body || {};
    const updates = [];
    const values = [];

    for (const field of APARTMENT_EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;
      let value = body[field];
      if (field === 'contact_via_whatsapp' || field === 'is_available') {
        value = value ? 1 : 0;
      }
      if (field === 'price_per_night') value = Number(value);
      if (['bedrooms', 'bathrooms', 'max_guests'].includes(field)) value = Number(value) || 0;
      updates.push(`${field} = ?`);
      values.push(value);
    }

    if (Array.isArray(body.images)) {
      const images = body.images.filter(Boolean);
      await pool.query('DELETE FROM apartment_images WHERE apartment_id = ?', [req.params.id]);
      if (images.length > 0) {
        const inserts = images.map((url, idx) => [req.params.id, url, idx]);
        await pool.query(
          'INSERT INTO apartment_images (apartment_id, image_url, sort_order) VALUES ?',
          [inserts],
        );
      }
      if (!body.image_url) {
        updates.push('image_url = ?');
        values.push(images[0] || null);
      }
    }

    if (updates.length === 0 && !Array.isArray(body.images)) {
      return res.status(400).json({ error: 'אין שדות לעדכון' });
    }

    if (req.user.role !== 'admin' && apt.status === 'approved' && updates.length > 0) {
      updates.push('status = ?');
      values.push('pending');
      updates.push('approved_at = NULL');
    }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE apartments SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
    res.json(await attachImagesToApartment(pool, rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const apt = await loadOwnedApartment(req, res);
    if (!apt) return;
    await pool.query('DELETE FROM apartments WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// מאשר מודעה לפי מזהה ושולח את מייל "המודעה פורסמה" לבעלים. מחזיר את הדירה או null.
async function approveApartmentById(id) {
  const [check] = await pool.query('SELECT id FROM apartments WHERE id = ?', [id]);
  if (check.length === 0) return null;

  await pool.query(
    `UPDATE apartments
     SET status = 'approved', approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL
     WHERE id = ?`,
    [id],
  );
  const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [id]);
  const apartment = await attachImagesToApartment(pool, rows[0]);

  // מייל למפרסם שהמודעה פורסמה וגלויה לכולם, עם קישורי צפייה ועריכה (best-effort)
  (async () => {
    try {
      let ownerEmail = apartment.owner_email || null;
      let ownerName = apartment.owner_name || null;
      if (apartment.owner_id) {
        const [u] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [
          apartment.owner_id,
        ]);
        if (u[0]) {
          ownerEmail = ownerEmail || u[0].email;
          ownerName = ownerName || u[0].full_name;
        }
      }
      if (!ownerEmail) return;
      await sendListingLiveEmail({
        to: ownerEmail,
        ownerName,
        apartment,
        listingUrl: `${APP_URL}/apartments/${apartment.id}`,
        editUrl: `${APP_URL}/my-apartments/${apartment.id}/edit`,
      });
    } catch (err) {
      console.error('[mailer] מייל "המודעה פורסמה" נכשל:', err.message);
    }
  })();

  return apartment;
}

router.post('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const apartment = await approveApartmentById(req.params.id);
    if (!apartment) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    res.json(apartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// אישור מודעה בקליק מתוך מייל המנהל — מאומת באמצעות טוקן חתום (ללא צורך בהתחברות).
router.get('/:id/email-approve', async (req, res) => {
  const renderPage = (title, body) =>
    res.type('html').send(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;text-align:center;padding:48px 16px;">
<div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #ece6d8;border-radius:16px;padding:32px 24px;">
${body}</div></body></html>`);

  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('חסר טוקן אישור');
    }

    let decoded;
    try {
      decoded = verifyApproveToken(token);
    } catch {
      return renderPage(
        'קישור לא תקין',
        `<h2 style="color:#b8860b;">הקישור אינו תקין או שפג תוקפו</h2>
         <p>ניתן להיכנס לפאנל הניהול ולאשר את המודעה ידנית.</p>
         <a href="${APP_URL}/admin" style="color:#1a2b4a;font-weight:700;">למעבר לפאנל הניהול</a>`,
      );
    }

    if (String(decoded.id) !== String(req.params.id)) {
      return res.status(400).send('טוקן אינו תואם למודעה');
    }

    const apartment = await approveApartmentById(req.params.id);
    if (!apartment) {
      return renderPage('המודעה לא נמצאה', `<h2>המודעה לא נמצאה</h2>`);
    }

    return renderPage(
      'המודעה אושרה',
      `<h2 style="color:#237804;">✅ המודעה אושרה ופורסמה!</h2>
       <p>"${apartment.title}" גלויה כעת לכולם.</p>
       <a href="${APP_URL}/apartments/${apartment.id}"
          style="display:inline-block;margin-top:8px;padding:12px 26px;background:#b8860b;color:#fff;
                 border-radius:10px;text-decoration:none;font-weight:700;">צפייה במודעה</a>
       <p style="margin-top:14px;"><a href="${APP_URL}/admin" style="color:#1a2b4a;">לפאנל הניהול</a></p>`,
    );
  } catch (error) {
    return res.status(500).send('אירעה שגיאה באישור המודעה');
  }
});

router.post('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM apartments WHERE id = ?', [req.params.id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    const reason = (req.body && req.body.reason) || null;
    await pool.query(
      `UPDATE apartments
       SET status = 'rejected', rejection_reason = ?, approved_at = NULL
       WHERE id = ?`,
      [reason, req.params.id],
    );
    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
    res.json(await attachImagesToApartment(pool, rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
