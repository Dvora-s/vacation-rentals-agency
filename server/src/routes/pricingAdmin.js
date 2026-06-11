import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  PRICING_CATEGORIES,
  PRICING_HIGHLIGHTS,
  PROMOTION_DISCOUNT_TYPES,
  coerceEnum,
} from '../constants/enums.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

function parseFeaturesInput(body) {
  if (Array.isArray(body.features)) return body.features.map((s) => String(s).trim()).filter(Boolean);
  if (typeof body.features_text === 'string') {
    return body.features_text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// ─── תוכניות ───
router.get('/plans', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM pricing_plans ORDER BY category ASC, sort_order ASC, id ASC`,
    );
    res.json(rows);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'הריצו db/pricing_tables.sql על מסד הנתונים' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const b = req.body || {};
    const slug = String(b.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    if (!slug) return res.status(400).json({ error: 'slug הוא שדה חובה (אנגלית, מספרים ומקף)' });
    if (!b.name?.trim()) return res.status(400).json({ error: 'שם המסלול הוא שדה חובה' });
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'מחיר לא תקין' });
    const category = coerceEnum(b.category, PRICING_CATEGORIES, 'hosts');
    const durationMonths = Math.max(1, parseInt(b.duration_months, 10) || 1);
    const features = parseFeaturesInput(b);
    if (features.length === 0) return res.status(400).json({ error: 'נא להוסיף לפחות תכונה אחת' });

    const compareAt =
      b.compare_at_price != null && b.compare_at_price !== ''
        ? Number(b.compare_at_price)
        : null;
    if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < 0)) {
      return res.status(400).json({ error: 'מחיר השוואה לא תקין' });
    }

    const highlight = coerceEnum(b.highlight_type, PRICING_HIGHLIGHTS, 'none');

    await pool.query(
      `INSERT INTO pricing_plans
       (slug, category, name, description, price, compare_at_price, currency, duration_months, duration_label,
        features_json, highlight_type, badge_text, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)`,
      [
        slug,
        category,
        b.name.trim(),
        b.description?.trim() || null,
        price,
        compareAt,
        (b.currency || 'ILS').trim().slice(0, 8),
        durationMonths,
        b.duration_label?.trim() || null,
        JSON.stringify(features),
        highlight,
        b.badge_text?.trim() || null,
        Number(b.sort_order) || 0,
        b.is_active === false ? 0 : 1,
      ],
    );
    const [rows] = await pool.query('SELECT * FROM pricing_plans WHERE slug = ?', [slug]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'slug כבר קיים' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'מזהה לא תקין' });
    const b = req.body || {};
    const [existing] = await pool.query('SELECT id FROM pricing_plans WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'מסלול לא נמצא' });

    if (b.slug != null) {
      const slug = String(b.slug)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
      if (!slug) return res.status(400).json({ error: 'slug לא תקין' });
      const [dup] = await pool.query('SELECT id FROM pricing_plans WHERE slug = ? AND id <> ?', [slug, id]);
      if (dup.length) return res.status(409).json({ error: 'slug כבר בשימוש' });
    }

    const fields = [];
    const vals = [];

    const set = (col, val) => {
      fields.push(`${col} = ?`);
      vals.push(val);
    };

    if (b.slug != null) {
      set(
        'slug',
        String(b.slug)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-'),
      );
    }
    if (b.name != null) set('name', String(b.name).trim() || null);
    if (b.description !== undefined) set('description', b.description?.trim() || null);
    if (b.price != null) {
      const price = Number(b.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'מחיר לא תקין' });
      set('price', price);
    }
    if (b.compare_at_price !== undefined) {
      if (b.compare_at_price === null || b.compare_at_price === '') set('compare_at_price', null);
      else {
        const c = Number(b.compare_at_price);
        if (!Number.isFinite(c) || c < 0) return res.status(400).json({ error: 'מחיר השוואה לא תקין' });
        set('compare_at_price', c);
      }
    }
    if (b.currency != null) set('currency', String(b.currency).trim().slice(0, 8));
    if (b.duration_months != null) set('duration_months', Math.max(1, parseInt(b.duration_months, 10) || 1));
    if (b.duration_label !== undefined) set('duration_label', b.duration_label?.trim() || null);
    if (b.features != null || b.features_text != null) {
      const features = parseFeaturesInput(b);
      if (features.length === 0) return res.status(400).json({ error: 'נא להוסיף לפחות תכונה אחת' });
      fields.push('features_json = CAST(? AS JSON)');
      vals.push(JSON.stringify(features));
    }
    if (b.highlight_type != null) {
      set('highlight_type', coerceEnum(b.highlight_type, PRICING_HIGHLIGHTS, 'none'));
    }
    if (b.badge_text !== undefined) set('badge_text', b.badge_text?.trim() || null);
    if (b.sort_order != null) set('sort_order', Number(b.sort_order) || 0);
    if (b.category != null) set('category', coerceEnum(b.category, PRICING_CATEGORIES, 'hosts'));
    if (b.is_active !== undefined) set('is_active', b.is_active ? 1 : 0);

    if (fields.length === 0) return res.status(400).json({ error: 'אין שדות לעדכון' });
    vals.push(id);
    await pool.query(`UPDATE pricing_plans SET ${fields.join(', ')} WHERE id = ?`, vals);
    const [rows] = await pool.query('SELECT * FROM pricing_plans WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query('DELETE FROM pricing_plans WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'לא נמצא' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── מבצעים ───
router.get('/promotions', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, pl.name AS plan_name
       FROM pricing_promotions p
       LEFT JOIN pricing_plans pl ON pl.id = p.pricing_plan_id
       ORDER BY p.starts_at DESC, p.id DESC`,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/promotions', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name?.trim()) return res.status(400).json({ error: 'שם המבצע הוא שדה חובה' });
    const dtype = coerceEnum(b.discount_type, PROMOTION_DISCOUNT_TYPES, 'percent');
    const dval = Number(b.discount_value);
    if (!Number.isFinite(dval) || dval < 0) return res.status(400).json({ error: 'ערך הנחה לא תקין' });
    if (dtype === 'percent' && dval > 100) return res.status(400).json({ error: 'אחוז הנחה לא יעלה על 100' });

    const starts = new Date(b.starts_at);
    const ends = new Date(b.ends_at);
    if (Number.isNaN(+starts) || Number.isNaN(+ends)) {
      return res.status(400).json({ error: 'תאריכי התחלה/סיום לא תקינים' });
    }
    if (ends <= starts) return res.status(400).json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' });

    let planId = null;
    if (b.pricing_plan_id != null && b.pricing_plan_id !== '') {
      planId = Number(b.pricing_plan_id);
      const [pl] = await pool.query('SELECT id FROM pricing_plans WHERE id = ?', [planId]);
      if (pl.length === 0) return res.status(400).json({ error: 'מסלול לא נמצא' });
    }

    const [result] = await pool.query(
      `INSERT INTO pricing_promotions
       (name, discount_type, discount_value, pricing_plan_id, is_active, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        b.name.trim(),
        dtype,
        dval,
        planId,
        b.is_active === false ? 0 : 1,
        starts,
        ends,
      ],
    );
    const [rows] = await pool.query('SELECT * FROM pricing_promotions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/promotions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'מזהה לא תקין' });
    const [exRows] = await pool.query('SELECT * FROM pricing_promotions WHERE id = ?', [id]);
    if (exRows.length === 0) return res.status(404).json({ error: 'לא נמצא' });
    const cur = exRows[0];

    const b = req.body || {};
    const starts = b.starts_at != null ? new Date(b.starts_at) : new Date(cur.starts_at);
    const ends = b.ends_at != null ? new Date(b.ends_at) : new Date(cur.ends_at);
    if (Number.isNaN(+starts) || Number.isNaN(+ends)) {
      return res.status(400).json({ error: 'תאריכי התחלה/סיום לא תקינים' });
    }
    if (ends <= starts) return res.status(400).json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' });

    const fields = [];
    const vals = [];

    const set = (col, val) => {
      fields.push(`${col} = ?`);
      vals.push(val);
    };

    if (b.name != null) set('name', String(b.name).trim());
    if (b.discount_type != null) set('discount_type', coerceEnum(b.discount_type, PROMOTION_DISCOUNT_TYPES, 'percent'));
    if (b.discount_value != null) {
      const dval = Number(b.discount_value);
      if (!Number.isFinite(dval) || dval < 0) return res.status(400).json({ error: 'ערך הנחה לא תקין' });
      const dtype = b.discount_type != null ? coerceEnum(b.discount_type, PROMOTION_DISCOUNT_TYPES, 'percent') : cur.discount_type;
      if (dtype === 'percent' && dval > 100) return res.status(400).json({ error: 'אחוז לא יעלה על 100' });
      set('discount_value', dval);
    }
    if (b.pricing_plan_id !== undefined) {
      if (b.pricing_plan_id === null || b.pricing_plan_id === '') set('pricing_plan_id', null);
      else {
        const pid = Number(b.pricing_plan_id);
        const [pl] = await pool.query('SELECT id FROM pricing_plans WHERE id = ?', [pid]);
        if (pl.length === 0) return res.status(400).json({ error: 'מסלול לא נמצא' });
        set('pricing_plan_id', pid);
      }
    }
    if (b.is_active !== undefined) set('is_active', b.is_active ? 1 : 0);
    if (b.starts_at != null) set('starts_at', starts);
    if (b.ends_at != null) set('ends_at', ends);

    if (fields.length === 0) return res.status(400).json({ error: 'אין שדות לעדכון' });

    vals.push(id);
    await pool.query(`UPDATE pricing_promotions SET ${fields.join(', ')} WHERE id = ?`, vals);

    const [rows] = await pool.query(
      `SELECT p.*, pl.name AS plan_name FROM pricing_promotions p
       LEFT JOIN pricing_plans pl ON pl.id = p.pricing_plan_id WHERE p.id = ?`,
      [id],
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/promotions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query('DELETE FROM pricing_promotions WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'לא נמצא' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
