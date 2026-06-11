import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { FAQ_SECTIONS, coerceEnum } from '../constants/enums.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/items', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, section, question, answer, sort_order, created_at, updated_at FROM faq_items ORDER BY section ASC, sort_order ASC, id ASC',
    );
    res.json(rows);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'הריצו npm run setup-faq על מסד הנתונים' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post('/items', async (req, res) => {
  try {
    const b = req.body || {};
    const section = coerceEnum(b.section, FAQ_SECTIONS, 'renters');
    const question = String(b.question || '').trim();
    const answer = String(b.answer || '').trim();
    if (!question) return res.status(400).json({ error: 'שאלה היא שדה חובה' });
    if (!answer) return res.status(400).json({ error: 'תשובה היא שדה חובה' });
    const sortOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;

    const [result] = await pool.query(
      `INSERT INTO faq_items (section, question, answer, sort_order) VALUES (?, ?, ?, ?)`,
      [section, question, answer, sortOrder],
    );
    const [rows] = await pool.query('SELECT * FROM faq_items WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'הריצו npm run setup-faq על מסד הנתונים' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: 'מזהה לא תקין' });

    const b = req.body || {};
    const [existing] = await pool.query('SELECT id FROM faq_items WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'לא נמצא' });

    // עדכון מלא — נמנעים מ־"אין שדות לעדכון" כשחלק מהשדות חסרים בגוף הבקשה
    const section = coerceEnum(b.section, FAQ_SECTIONS, 'renters');
    const question = String(b.question ?? '').trim();
    const answer = String(b.answer ?? '').trim();
    const sortOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;

    if (!question) return res.status(400).json({ error: 'שאלה היא שדה חובה' });
    if (!answer) return res.status(400).json({ error: 'תשובה היא שדה חובה' });

    await pool.query(
      'UPDATE faq_items SET section = ?, question = ?, answer = ?, sort_order = ? WHERE id = ?',
      [section, question, answer, sortOrder, id],
    );

    const [rows] = await pool.query('SELECT * FROM faq_items WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'מזהה לא תקין' });

    const [r] = await pool.query('DELETE FROM faq_items WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'לא נמצא' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
