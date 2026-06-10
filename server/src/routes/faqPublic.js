import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

const SECTION_ORDER = ['renters', 'hosts'];

const SECTION_META = {
  renters: {
    id: 'renters',
    icon: '🏠',
    title: 'שאלות נפוצות – למחפשי דירות (שוכרים)',
  },
  hosts: {
    id: 'hosts',
    icon: '🔑',
    title: 'שאלות נפוצות – למפרסמי דירות (מארחים)',
  },
};

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, section, question, answer, sort_order FROM faq_items ORDER BY section ASC, sort_order ASC, id ASC',
    );

    const sections = SECTION_ORDER.map((key) => ({
      ...SECTION_META[key],
      items: rows
        .filter((r) => r.section === key)
        .map((r) => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
        })),
    }));

    res.json({ sections });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'הריצו npm run setup-faq (או db/faq_tables.sql) על מסד הנתונים' });
    }
    res.status(500).json({ error: e.message });
  }
});

export default router;
