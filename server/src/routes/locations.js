import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// מאגר "יישובים" של הלמ"ס דרך data.gov.il (CKAN). כל יישוב כולל "סמל_נפה"
// שממנו נגזר המחוז הרשמי, ולפיו אנחנו ממפים לאזורים של האתר.
const RESOURCE_ID = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
const DATA_URL =
  `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=1500`;

// ה-WAF של data.gov.il חוסם בקשות "לא דפדפניות"; ה-User-Agent הזה הוא המוסכמה
// הרשמית לקליינטים חיצוניים ועוקף את החסימה.
const GOV_USER_AGENT = 'datagov-external-client';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // הנתונים מתעדכנים לכל היותר פעם ביום.
const FETCH_TIMEOUT_MS = 8000;

let cache = { at: 0, cityRegions: null };

// גזירת אזור האתר ממספר הנפה הרשמי (הספרה הראשונה = המחוז):
// 1 ירושלים · 2 צפון · 3 חיפה · 4 מרכז · 5 תל אביב · 6 דרום · 7 יו"ש.
function regionFromNafa(nafa) {
  const n = Number(nafa);
  if (!Number.isFinite(n)) return null;
  switch (Math.floor(n / 10)) {
    case 1:
      return 'jerusalem';
    case 2:
    case 3:
      return 'north';
    case 4:
    case 5:
      return 'center';
    case 6:
      return 'south';
    case 7:
      // יו"ש: בנימין (74), גוש עציון (76) והר חברון (77) משויכים ל"ירושלים והסביבה";
      // שומרון (71-73) ובקעת הירדן (75) משויכים ל"מרכז".
      return n === 74 || n === 76 || n === 77 ? 'jerusalem' : 'center';
    default:
      return null;
  }
}

async function fetchGovCityRegions() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(DATA_URL, {
      headers: { 'User-Agent': GOV_USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`data.gov.il responded ${res.status}`);
    const json = await res.json();
    const records = json?.result?.records;
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('empty dataset');
    }

    const cityRegions = {};
    for (const row of records) {
      const name = String(row['שם_ישוב'] || '').trim();
      if (!name || name.startsWith('-')) continue; // שורות "ללא שיוך" וכד'.
      const region = regionFromNafa(row['סמל_נפה']);
      if (region) cityRegions[name] = region;
    }
    return cityRegions;
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/locations/regions
// מחזיר מיפוי { "שם יישוב": "regionId" } לכל יישובי הלמ"ס, עם caching ל-24 שעות.
router.get('/regions', async (_req, res) => {
  const now = Date.now();
  if (cache.cityRegions && now - cache.at < CACHE_TTL_MS) {
    return res.json({
      source: 'gov',
      updatedAt: new Date(cache.at).toISOString(),
      cityRegions: cache.cityRegions,
    });
  }

  try {
    const cityRegions = await fetchGovCityRegions();
    cache = { at: now, cityRegions };
    res.json({ source: 'gov', updatedAt: new Date(now).toISOString(), cityRegions });
  } catch (err) {
    logger.warn('[locations] שליפת יישובים מהמאגר הממשלתי נכשלה:', err.message);
    if (cache.cityRegions) {
      // מחזירים נתונים ישנים מה-cache אם השליפה נכשלה — עדיף מאשר כלום.
      return res.json({
        source: 'gov-stale',
        updatedAt: new Date(cache.at).toISOString(),
        cityRegions: cache.cityRegions,
      });
    }
    res.status(502).json({
      error: 'לא ניתן לטעון את רשימת היישובים מהמאגר הממשלתי כרגע.',
    });
  }
});

export default router;
