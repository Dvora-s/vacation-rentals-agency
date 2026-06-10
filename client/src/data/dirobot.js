// מנוע "דירובוט" — ניתוח שאילתות בעברית והתאמת דירות.
// כל הלוגיקה רצה בצד הלקוח על נתוני דירות *מאושרות בלבד* (getApartments),
// ולכן הבוט לעולם לא נחשף למידע שאינו ציבורי (מודעות שלא אושרו, נתוני ניהול וכו').
import { CITY_NAMES } from './locations';
import { SEARCH_CATEGORIES, apartmentMatchesCategory } from './categories';

// מילות מספר בעברית → ספרה.
const HEB_NUMBERS = {
  אחד: 1, אחת: 1,
  שני: 2, שתי: 2, שניים: 2, שתיים: 2,
  שלוש: 3, שלושה: 3, שלושת: 3,
  ארבע: 4, ארבעה: 4, ארבעת: 4,
  חמש: 5, חמישה: 5, חמשת: 5,
  שש: 6, שישה: 6, ששת: 6,
  שבע: 7, שבעה: 7, שבעת: 7,
  שמונה: 8, שמונת: 8,
  תשע: 9, תשעה: 9,
  עשר: 10, עשרה: 10,
};

// נרמול טקסט: גרשיים/מרכאות אחידים והסרת רווחים כפולים.
function normalize(text) {
  return String(text || '')
    .replace(/["'`׳״]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// מנסה לחלץ מספר (ספרה או מילה בעברית) שמופיע לפני אחת ממילות המפתח.
function extractCountBefore(text, keywords) {
  for (const kw of keywords) {
    // ספרה: "2 חדרים"
    const digit = new RegExp(`(\\d+)\\s*${kw}`).exec(text);
    if (digit) return Number(digit[1]);
    // מילה בעברית: "שני חדרים"
    const wordsPattern = Object.keys(HEB_NUMBERS).join('|');
    const word = new RegExp(`(${wordsPattern})\\s+(?:[^\\s]+\\s+){0,1}?${kw}`).exec(text);
    if (word && HEB_NUMBERS[word[1]] != null) return HEB_NUMBERS[word[1]];
  }
  return null;
}

// מחלץ מחיר מקסימלי מתוך ביטויים כמו "עד 700", "תקציב 600", "800 ש\"ח".
function extractMaxPrice(text) {
  const ceil = /(?:עד|מתחת ל|פחות מ|תקציב(?: של)?|מקסימום|מחיר(?: עד)?|לא יותר מ)\s*(\d{2,5})/.exec(
    text,
  );
  if (ceil) return Number(ceil[1]);
  const currency = /(\d{2,5})\s*(?:ש"ח|שח|שקל(?:ים)?|₪)/.exec(text);
  if (currency) return Number(currency[1]);
  return null;
}

// מאתר עיר מוכרת מתוך מאגר הערים (העדפה לשם הארוך ביותר שמופיע בטקסט).
function extractCity(text) {
  const sorted = [...CITY_NAMES].sort((a, b) => b.length - a.length);
  for (const city of sorted) {
    if (text.includes(city)) return city;
  }
  return null;
}

// מאתר קטגוריה (פסח, שבת, חגים...) לפי מילות מפתח.
function extractCategory(text) {
  const lower = text.toLowerCase();
  for (const cat of SEARCH_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { id: cat.id, label: cat.label };
    }
  }
  return null;
}

// סוגי נכס לפי מילות מפתח (וילה, צימר, מתחם אירוח וכו').
const PROPERTY_TYPE_KEYWORDS = [
  { label: 'מתחמי אירוח', words: ['מתחם', 'מתחמי אירוח', 'קמפוס'] },
  { label: 'וילה', words: ['וילה', 'וילת', 'בית פרטי'] },
  { label: 'צימר', words: ['צימר', 'צימרים'] },
  { label: 'בקתה', words: ['בקתה', 'בקתת'] },
  { label: 'יחידת אירוח', words: ['יחידת אירוח', 'יחידה', 'יחידת'] },
  { label: 'דירה', words: ['דירה', 'דירת'] },
];

function extractPropertyType(text) {
  for (const t of PROPERTY_TYPE_KEYWORDS) {
    if (t.words.some((w) => text.includes(w))) return t.label;
  }
  return null;
}

// כוונת ההודעה: ברכה / תודה / איפוס / עזרה ביצירת קשר / עזרה כללית / חיפוש.
export function detectIntent(text) {
  const t = normalize(text);
  if (/(שיחה חדשה|התחל מחדש|מהתחלה|נתחיל מחדש|לאפס)/.test(t)) {
    return 'reset';
  }
  if (/^(תודה|תודה רבה|מעולה|מצוין|סבבה|אחלה|יופי|כל הכבוד|אלוף|מהמם)\b/.test(t) && t.length < 18) {
    return 'thanks';
  }
  if (/^(היי|הי|שלום|הלו|מה קורה|אהלן|בוקר טוב|ערב טוב|צהריים טובים)\b/.test(t) && t.length < 16) {
    return 'greeting';
  }
  if (/(ליצור קשר|יצירת קשר|איך.*(מזמינ|יוצר|מתקשר|פונ)|טלפון|להזמין|לתאם|מספר של|וואטסאפ|מייל של|לדבר עם)/.test(t)) {
    return 'contact';
  }
  if (/(מה אתה|מי אתה|מה אפשר|איך זה עובד|מה אתה יודע|עזרה|תעזור|מה השירות)/.test(t)) {
    return 'help';
  }
  return 'search';
}

// מנתח שאילתה חופשית בעברית לקריטריוני חיפוש.
export function parseQuery(text) {
  const t = normalize(text);
  const bedrooms = extractCountBefore(t, ['חדרי שינה', 'חדר שינה', 'חדרים', 'חדר']);
  const guests = extractCountBefore(t, ['נפשות', 'נפש', 'אורחים', 'אורח', 'מיטות', 'מיטה', 'אנשים', 'איש']);
  const maxPrice = extractMaxPrice(t);
  const city = extractCity(t);
  const category = extractCategory(t);
  const propertyType = extractPropertyType(t);

  return {
    bedrooms: bedrooms || null,
    guests: guests || null,
    maxPrice: maxPrice || null,
    city: city || null,
    categoryId: category?.id || null,
    categoryLabel: category?.label || null,
    propertyType: propertyType || null,
    hasCriteria: Boolean(bedrooms || guests || maxPrice || city || category || propertyType),
  };
}

// קריטריונים ריקים — בסיס לזיכרון השיחה.
export function emptyCriteria() {
  return {
    bedrooms: null,
    guests: null,
    maxPrice: null,
    city: null,
    categoryId: null,
    categoryLabel: null,
    propertyType: null,
    hasCriteria: false,
  };
}

// ממזג בקשה חדשה על גבי הקריטריונים הקודמים (לחידוד שיחה: "ועכשיו עד 600 ש\"ח").
export function mergeCriteria(prev, next) {
  const base = prev || emptyCriteria();
  const merged = {
    bedrooms: next.bedrooms ?? base.bedrooms,
    guests: next.guests ?? base.guests,
    maxPrice: next.maxPrice ?? base.maxPrice,
    city: next.city ?? base.city,
    categoryId: next.categoryId ?? base.categoryId,
    categoryLabel: next.categoryLabel ?? base.categoryLabel,
    propertyType: next.propertyType ?? base.propertyType,
  };
  merged.hasCriteria = Boolean(
    merged.bedrooms ||
      merged.guests ||
      merged.maxPrice ||
      merged.city ||
      merged.categoryId ||
      merged.propertyType,
  );
  return merged;
}

function passesCity(apt, city) {
  if (!city) return true;
  return String(apt.location || '').includes(city) || String(apt.address || '').includes(city);
}

// בודק התאמה של דירה לקריטריונים, עם אפשרות לוותר על חלק מהם (להרחבת התוצאות).
function matchWith(apartments, c, { ignore = [] } = {}) {
  return apartments.filter((apt) => {
    if (!ignore.includes('city') && !passesCity(apt, c.city)) return false;
    if (!ignore.includes('bedrooms') && c.bedrooms && Number(apt.bedrooms) < c.bedrooms) return false;
    if (!ignore.includes('guests') && c.guests && Number(apt.max_guests) < c.guests) return false;
    if (!ignore.includes('price') && c.maxPrice && Number(apt.price_per_night) > c.maxPrice) return false;
    if (!ignore.includes('category') && c.categoryId && !apartmentMatchesCategory(apt, c.categoryId))
      return false;
    if (
      !ignore.includes('propertyType') &&
      c.propertyType &&
      String(apt.property_type || '') !== c.propertyType
    )
      return false;
    return true;
  });
}

// מדרג תוצאות: התאמה מדויקת יותר של חדרים/נפשות והמחיר הזול יותר מקבלים עדיפות.
function sortByRelevance(list, c) {
  return [...list].sort((a, b) => {
    const roomDiffA = c.bedrooms ? Math.abs(Number(a.bedrooms) - c.bedrooms) : 0;
    const roomDiffB = c.bedrooms ? Math.abs(Number(b.bedrooms) - c.bedrooms) : 0;
    if (roomDiffA !== roomDiffB) return roomDiffA - roomDiffB;
    return (Number(a.price_per_night) || 0) - (Number(b.price_per_night) || 0);
  });
}

// מחזיר התאמות + הערות על הרחבות שבוצעו (אם לא נמצאו תוצאות מדויקות).
export function findMatches(apartments, criteria, limit = 4) {
  const available = apartments.filter((a) => a.is_available !== false);

  // 1) ניסיון לפי כל הקריטריונים.
  let matches = matchWith(available, criteria);
  const relaxed = [];

  // 2) הרחבה הדרגתית: מחיר → קטגוריה → חדרים/נפשות (העיר נשמרת עד הסוף).
  const relaxOrder = [
    { keys: ['price'], note: 'הרחבתי את טווח המחיר' },
    { keys: ['propertyType'], note: 'כללתי גם סוגי נכס אחרים' },
    { keys: ['category'], note: 'התעלמתי מהעונה/קטגוריה' },
    { keys: ['bedrooms', 'guests'], note: 'הרחבתי את מספר החדרים/הנפשות' },
  ];

  let ignore = [];
  for (const step of relaxOrder) {
    if (matches.length > 0) break;
    ignore = [...ignore, ...step.keys];
    matches = matchWith(available, criteria, { ignore });
    if (matches.length > 0) relaxed.push(step.note);
  }

  // 3) הרחבה אחרונה: גם העיר (אם עדיין ריק ויש עיר).
  if (matches.length === 0 && criteria.city) {
    ignore = [...ignore, 'city'];
    matches = matchWith(available, criteria, { ignore });
    if (matches.length > 0) relaxed.push(`לא נמצאו דירות ב${criteria.city}, אז הצגתי אפשרויות נוספות`);
  }

  return {
    matches: sortByRelevance(matches, criteria).slice(0, limit),
    total: matches.length,
    relaxed,
  };
}

// בונה תיאור מילולי של מה שהבוט הבין מהבקשה.
export function describeCriteria(c) {
  const parts = [];
  if (c.propertyType) parts.push(c.propertyType);
  if (c.city) parts.push(`ב${c.city}`);
  if (c.bedrooms) parts.push(`${c.bedrooms} חדרים`);
  if (c.guests) parts.push(`עד ${c.guests} נפשות`);
  if (c.maxPrice) parts.push(`עד ₪${c.maxPrice} ללילה`);
  if (c.categoryLabel) parts.push(`ל${c.categoryLabel}`);
  return parts.join(', ');
}

// שאלת המשך ידידותית לחידוד החיפוש, לפי מה שעדיין חסר.
export function followUpPrompt(c) {
  if (!c.city) return '📍 באיזה אזור או עיר תרצו לחפש?';
  if (!c.bedrooms && !c.guests) return '🛏️ לכמה נפשות או כמה חדרים אתם זקוקים?';
  if (!c.maxPrice) return '💰 יש תקציב מקסימלי ללילה? (אפשר גם לדלג)';
  if (!c.categoryLabel) return '📅 לאיזו תקופה? (שבת, פסח, חגים, אמצ"ש...)';
  return 'רוצים שאחדד עוד משהו, או להציג את כל התוצאות?';
}

// בונה כתובת חיפוש מלאה לעמוד הדירות עם הסינונים שזוהו.
export function buildSearchUrl(c) {
  const params = new URLSearchParams();
  if (c.categoryId) params.set('category', c.categoryId);
  if (c.city) params.set('location', c.city);
  const qs = params.toString();
  return qs ? `/apartments?${qs}` : '/apartments';
}
