import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paymeCreateLimiter } from '../middleware/rateLimit.js';
import { validatePayMeCreateBody } from '../middleware/validatePayMeCreate.js';
import { createPayMePayment, getPayMePaymentStatus } from '../controllers/paymentController.js';
import { sendPaymentReceiptEmail } from '../utils/mailer.js';
import { getPlanAmount, isPremiumApartment } from '../config/pricing.js';

const router = Router();

/**
 * PayMe — יצירת תשלום (מחזיר checkoutUrl). דורש JWT.
 * Rate limit: ראו paymeCreateLimiter (בפרודקשן מומלץ Redis / מגבלה בפרוקסי).
 */
router.post('/create', requireAuth, paymeCreateLimiter, validatePayMeCreateBody, createPayMePayment);

const LISTING_FEE_PER_MONTH = 30; // ש"ח — תעריף בסיס (דירה רגילה לחודש)

function formatHebrewDate(date) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * רישום תשלום על פרסום דירה.
 * בעל הדירה (או אדמין) מבצע POST /api/payments עם:
 *   { apartment_id, months, provider, provider_reference }
 * בשלב הזה זו "דמה" של תשלום — נשמר כ-paid מיידית.
 * בהמשך מתחברים לסליקה אמיתית (PayPlus / Tranzila / Stripe).
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      apartment_id,
      months = 1,
      tier: requestedTier = 'standard',
      provider = 'manual',
      provider_reference = null,
    } = req.body || {};

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

    // הנכס מחייב פרימיום אם סוג הנכס הוא "מתחמי אירוח" — אכיפה בצד השרת.
    const tier = isPremiumApartment(apt) || requestedTier === 'premium' ? 'premium' : 'standard';
    const amount = getPlanAmount(tier, monthsInt);
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
    const payment = payRows[0];

    // עדכון תוקף המודעה (expires_at) ואיפוס תזכורת. אם המודעה הייתה "פגת תוקף" — מחזירים אותה לאוויר.
    if (apt.status === 'expired') {
      await pool.query(
        `UPDATE apartments
         SET expires_at = ?, expiry_reminder_sent = 0, status = 'approved', approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [periodEnd, apartment_id],
      );
    } else {
      await pool.query(
        'UPDATE apartments SET expires_at = ?, expiry_reminder_sent = 0 WHERE id = ?',
        [periodEnd, apartment_id],
      );
    }

    // שליחת מייל אישור הזמנה/תשלום (best-effort)
    (async () => {
      try {
        const [u] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [
          req.user.id,
        ]);
        const billingName = apt.owner_name || u[0]?.full_name || '';
        const billingEmail = u[0]?.email || apt.owner_email || req.user.email;
        const billingAddress = [apt.address, apt.location].filter(Boolean).join(', ');
        if (!billingEmail) return;

        await sendPaymentReceiptEmail({
          to: billingEmail,
          order: {
            number: String(10000 + payment.id),
            date: formatHebrewDate(periodStart),
            items: [
              {
                name: `מנוי פרסום מודעה${tier === 'premium' ? ' (מתחם אירוח)' : ''} – ${monthsInt} ${monthsInt === 1 ? 'חודש' : 'חודשים'}`,
                qty: 1,
                price: amount,
              },
            ],
            total: amount,
            paymentMethod: 'תשלום מאובטח בכרטיס אשראי',
            billing: { name: billingName, address: billingAddress, email: billingEmail },
          },
        });
      } catch (err) {
        console.error('[mailer] מייל אישור תשלום נכשל:', err.message);
      }
    })();

    res.status(201).json(payment);
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

/** Skip non-numeric `:id` so `/mine` etc. are not captured as `/:id/status` (Express 5 path-to-regexp). */
function skipUnlessNumericPaymentId(req, res, next) {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return next('route');
  }
  next();
}

/**
 * PayMe — סטטוס תשלום פנימי (מזהה שורה ב־`payments`). דורש JWT; מנהל יכול לצפות בכל התשלומים.
 * `?sync=1` — מנסה לסנכרן מול PayMe לפני החזרה (best-effort).
 * חייב להופיע אחרי נתיבים ליטרליים כמו `/mine` ו־`/fee`.
 */
router.get('/:id/status', requireAuth, skipUnlessNumericPaymentId, getPayMePaymentStatus);

export default router;
