// קטגוריות הדירות — מקור אמת יחיד לכל האתר.
// הערך נשמר בשדה rental_period של הדירה (label זהה לערך המאוחסן).
// id — הערך שעובר ב-URL ?category=, label — התצוגה למשתמש.
export const CATEGORIES = [
  {
    id: 'all-year',
    label: 'כל השנה',
    description: 'דירות זמינות לאורך כל השנה',
    icon: '🗓️',
    image:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    keywords: ['כל השנה'],
  },
  {
    id: 'bein-hazmanim',
    label: 'בין הזמנים',
    description: 'דירות לימי החופש',
    icon: '🌿',
    image:
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80',
    keywords: ['בין הזמנים', 'בה"ז', 'חופש', 'נופש'],
  },
  {
    id: 'shabbat',
    label: 'שבתות',
    description: 'דירות לשבתות',
    icon: '🕯️',
    image:
      'https://images.unsplash.com/photo-1606293926249-ed22332b3b97?w=800&q=80',
    keywords: ['שבת', 'שבתות'],
  },
  {
    id: 'holidays',
    label: 'חגים',
    description: 'דירות לחגי ישראל',
    icon: '🕎',
    image:
      'https://images.unsplash.com/photo-1605248918193-ec96a527ea34?w=800&q=80',
    keywords: ['חג', 'חגים', 'ראש השנה', 'שבועות', 'חנוכה', 'פורים'],
  },
  {
    id: 'pesach',
    label: 'פסח',
    description: 'דירות לחג הפסח',
    icon: '🍷',
    image:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
    keywords: ['פסח'],
  },
  {
    id: 'sukkot',
    label: 'סוכות',
    description: 'דירות לחג הסוכות',
    icon: '🛖',
    image:
      'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=800&q=80',
    keywords: ['סוכות', 'סוכה'],
  },
];

// אפשרויות לטופס פרסום דירה (ערכי rental_period).
export const CATEGORY_OPTIONS = CATEGORIES.map((c) => c.label);

// הקטגוריה "כל השנה" — דירות כאלה מופיעות בכל סינון קטגוריה.
export const ALL_YEAR_LABEL = 'כל השנה';

export function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

export function findCategoryByLabel(label) {
  return CATEGORIES.find((c) => c.label === label) || null;
}

// מפרק את שדה rental_period (יכול להכיל כמה קטגוריות מופרדות בפסיק) למערך תוויות.
export function getApartmentCategories(apartment) {
  if (!apartment) return [];
  const raw = apartment.rental_period || apartment.category || '';
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function apartmentMatchesCategory(apartment, categoryId) {
  if (!categoryId) return true;
  const cat = findCategory(categoryId);
  if (!cat) return true;

  const cats = getApartmentCategories(apartment);
  // התאמה ישירה: הדירה משויכת לקטגוריה הנבחרת
  if (cats.includes(cat.label)) return true;
  if (apartment.category === categoryId) return true;
  // דירות "כל השנה" מופיעות בכל סינון קטגוריה
  if (cats.includes(ALL_YEAR_LABEL)) return true;
  // התאמה לפי מילות מפתח בכותרת/תיאור (גיבוי לנתונים ישנים)
  const haystack = [apartment.title, apartment.description, apartment.rental_period]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return cat.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
