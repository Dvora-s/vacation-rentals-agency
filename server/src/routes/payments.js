import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const LISTING_FEE_PER_MONTH = 30; // ש"ח

/**
 * רישום תשלום על פרסום דירה.
 * בעל הדירה (או אדמין) מבצע POST /api/payments עם:
 *   { apartment_id, months, provider, provider_reference }
 * בשלב הזה זו "דמה" של תשלום — נשמר כ-paid מיידית.
 * בהמשך מתחברים לסליקה אמיתית (PayPlus / Tranzila / Stripe).
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { apartment_id, months = 1, provider = 'manual', provider_reference = null } =
      req.body || {};

    if (!apartment_id) {
      return res.status(400).json({ error: 'נדרש מזהה דירה (apartment_id)' });
    }
    const monthsInt = Math.max(1, Number(months) || 1);

    const [rows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [apartment_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
    const apt = rows[0];
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && apt.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'אין הרשאה לשלם עבור דירה זו' });
    }

    const amount = LISTING_FEE_PER_MONTH * monthsInt;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + monthsInt);

    const [result] = await pool.query(
      `INSERT INTO listing_payments
        (apartment_id, user_id, amount, currency, months, status, provider, provider_reference,
         paid_at, period_start, period_end)
       VALUES (?, ?, ?, 'ILS', ?, 'paid', ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [
        apartment_id,
        req.user.id,
        amount,
        monthsInt,
        provider,
        provider_reference,
        periodStart.toISOString().slice(0, 10),
        periodEnd.toISOString().slice(0, 10),
      ],
    );

    const [payRows] = await pool.query('SELECT * FROM listing_payments WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(payRows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// תשלומים של המשתמש הנוכחי
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lp.*, a.title AS apartment_title
       FROM listing_payments lp
       LEFT JOIN apartments a ON a.id = lp.apartment_id
       WHERE lp.user_id = ?
       ORDER BY lp.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// כל התשלומים (אדמין)
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lp.*, a.title AS apartment_title, u.email AS user_email
       FROM listing_payments lp
       LEFT JOIN apartments a ON a.id = lp.apartment_id
       LEFT JOIN users u ON u.id = lp.user_id
       ORDER BY lp.created_at DESC`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fee', (_req, res) => {
  res.json({ amount_per_month: LISTING_FEE_PER_MONTH, currency: 'ILS' });
});

export default router;
