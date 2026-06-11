import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// טבלת תוכן ניתן-לעריכה: דריסות טקסט/גודל-גופן לכל "בלוק" באתר, לפי מפתח ייחודי.
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS site_content (
       content_key VARCHAR(191) PRIMARY KEY,
       body TEXT NULL,
       font_size VARCHAR(20) NULL,
       color VARCHAR(30) NULL,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     )`,
  );
  // טבלאות שנוצרו בגרסה קודמת ללא עמודת color — הוספה אידמפוטנטית.
  try {
    await pool.query('ALTER TABLE site_content ADD COLUMN color VARCHAR(30) NULL');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
  tableReady = true;
}

function sanitizeKey(raw) {
  const key = String(raw || '').trim();
  // מפתחות הם מזהים פנימיים שאנו קובעים בקוד — מגבילים לתווים בטוחים.
  if (!key || key.length > 191 || !/^[a-zA-Z0-9._:-]+$/.test(key)) return null;
  return key;
}

function sanitizeFontSize(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = String(raw).trim();
  // מותר: מספר פיקסלים פשוט (לדוגמה "18" או "18px") או יחידת rem/em.
  if (/^\d{1,3}(\.\d+)?(px|rem|em)?$/.test(value)) {
    return /^\d/.test(value) && !/(px|rem|em)$/.test(value) ? `${value}px` : value;
  }
  return null;
}

function sanitizeColor(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = String(raw).trim();
  // מותר: hex (3/6/8 ספרות) או rgb()/rgba().
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return value;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(value)) {
    return value;
  }
  return null;
}

// ── ציבורי: כל הדריסות, כמפה { key: { text, fontSize } } ──
router.get('/', async (_req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query('SELECT content_key, body, font_size, color FROM site_content');
    const map = {};
    for (const row of rows) {
      map[row.content_key] = {
        text: row.body,
        fontSize: row.font_size || null,
        color: row.color || null,
      };
    }
    res.json(map);
  } catch (error) {
    // אם המסד אינו זמין — מחזירים מפה ריקה כדי שהאתר ימשיך להציג טקסט ברירת מחדל.
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json({});
    console.error('[content] load error:', error.message);
    res.json({});
  }
});

// ── מנהל: שמירת/עדכון דריסה ──
router.put('/:key', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureTable();
    const key = sanitizeKey(req.params.key);
    if (!key) return res.status(400).json({ error: 'מפתח תוכן לא תקין' });

    const body = req.body || {};
    const text = body.text === null || body.text === undefined ? null : String(body.text);
    const fontSize = sanitizeFontSize(body.fontSize);
    const color = sanitizeColor(body.color);

    await pool.query(
      `INSERT INTO site_content (content_key, body, font_size, color)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE body = VALUES(body), font_size = VALUES(font_size), color = VALUES(color)`,
      [key, text, fontSize, color],
    );

    res.json({ key, text, fontSize, color });
  } catch (error) {
    console.error('[content] save error:', error.message);
    res.status(500).json({ error: 'שמירת התוכן נכשלה' });
  }
});

// ── מנהל: איפוס דריסה (חזרה לברירת המחדל בקוד) ──
router.delete('/:key', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureTable();
    const key = sanitizeKey(req.params.key);
    if (!key) return res.status(400).json({ error: 'מפתח תוכן לא תקין' });
    await pool.query('DELETE FROM site_content WHERE content_key = ?', [key]);
    res.status(204).end();
  } catch (error) {
    console.error('[content] reset error:', error.message);
    res.status(500).json({ error: 'איפוס התוכן נכשל' });
  }
});

export default router;
