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
    image: '/categories/bein-hazmanim-beach.png',
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
    image: '/categories/holidays.png',
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
  {
    id: 'midweek',
    label: 'אמצ"ש',
    description: 'אירוח באמצע השבוע',
    icon: '📅',
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
    keywords: ['אמצ"ש', 'אמצע שבוע', 'אמצש', 'חול'],
  },
  {
    id: 'short-term',
    label: 'טווח קצר',
    description: 'השכרת דירה לתקופה של בין יומיים עד שישה חודשים',
    icon: '🔑',
    image: '/categories/short-term-seaview.png',
    keywords: ['טווח קצר', 'קצר', 'יומיים', 'חודשים', 'תקופה'],
  },
];

// ארבע הקטגוריות הראשיות לכרטיסי דף הבית (תמונה + כותרת + כותרת משנה).
export const HOMEPAGE_CATEGORIES = [
  {
    id: 'shabbat',
    title: 'שבת',
    subtitle: 'דירות לשבת וחג',
    image: '/categories/shabbat.png',
  },
  {
    id: 'holidays',
    title: 'חג',
    subtitle: 'דירות לסוכות ופסח',
    image: '/categories/holidays.png',
  },
  {
    id: 'bein-hazmanim',
    title: 'בין הזמנים',
    subtitle: 'דירות לימי החופש',
    image: '/categories/bein-hazmanim-beach.png',
  },
  {
    id: 'short-term',
    title: 'דירות לטווח קצר',
    subtitle: 'השכרת דירה לתקופה של בין יומיים עד שישה חודשים',
    image: '/categories/short-term-seaview.png',
  },
];

// אפשרויות לטופס פרסום דירה (ערכי rental_period).
export const CATEGORY_OPTIONS = CATEGORIES.map((c) => c.label);

// הקטגוריה "כל השנה" — דירות כאלה מופיעות בכל סינון קטגוריה.
export const ALL_YEAR_LABEL = 'כל השנה';

// קטגוריות לחיפוש/סינון — ללא "כל השנה".
// בפרסום עדיין אפשר לסמן "כל השנה" (הדירה תיכלל בכל החיפושים),
// אך אי אפשר לחפש לפי "כל השנה" עצמה.
export const SEARCH_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all-year');

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
