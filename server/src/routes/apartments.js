import { Router } from 'express';
import pool from '../config/db.js';
import {
  APARTMENT_EDITABLE_FIELDS,
  attachImagesToApartment,
  attachImagesToApartments,
} from '../utils/mapApartment.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { sendNewListingToAdmin, sendListingLiveEmail } from '../utils/mailer.js';

const router = Router();

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

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

    res.json(await attachImagesToApartment(pool, apt));
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
        if (!publisherName) {
          const [u] = await pool.query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
          publisherName = u[0]?.full_name || req.user.email;
        }
        await sendNewListingToAdmin({
          to: adminEmails.join(', '),
          apartment,
          publisherName,
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

router.post('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM apartments WHERE id = ?', [req.params.id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    await pool.query(
      `UPDATE apartments
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL
       WHERE id = ?`,
      [req.params.id],
    );
    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
    const apartment = await attachImagesToApartment(pool, rows[0]);

    // מייל למפרסם שהמודעה פורסמה וגלויה לכולם, עם קישורי צפייה ועריכה (best-effort)
    (async () => {
      try {
        let ownerEmail = apartment.owner_email || null;
        let ownerName = apartment.owner_name || null;
        if (apartment.owner_id) {
          const [u] = await pool.query(
            'SELECT full_name, email FROM users WHERE id = ?',
            [apartment.owner_id],
          );
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

    res.json(apartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
