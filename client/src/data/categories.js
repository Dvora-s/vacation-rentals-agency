// קטגוריות לסינון דירות. ה-id הוא הערך שעובר ב-URL,
// ה-label המוצג למשתמש, ו-keywords הם מילים שאם מופיעות בכותרת/תיאור הדירה
// הדירה תופיע בקטגוריה הזו.
export const CATEGORIES = [
  {
    id: 'shabbat',
    label: 'שבתות',
    short: 'שבתות',
    description: 'דירות לשבתות',
    icon: '🕯️',
    image:
      'https://images.unsplash.com/photo-1606293926249-ed22332b3b97?w=800&q=80',
    keywords: ['שבת', 'שבתות'],
  },
  {
    id: 'holidays',
    label: 'חגים',
    short: 'חגים',
    description: 'דירות לחגי ישראל',
    icon: '🕎',
    image:
      'https://images.unsplash.com/photo-1605248918193-ec96a527ea34?w=800&q=80',
    keywords: ['חג', 'פסח', 'סוכות', 'ראש השנה', 'חנוכה', 'פורים', 'שבועות'],
  },
  {
    id: 'bein-hazmanim',
    label: 'בין הזמנים',
    short: 'בין הזמנים',
    description: 'דירות לימי החופש',
    icon: '🌿',
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    keywords: ['בין הזמנים', 'בה"ז', 'חופש', 'נופש'],
  },
  {
    id: 'hotels',
    label: 'מלונות ומתחמי אירוח',
    short: 'מלונות',
    description: 'מלונות ומתחמי אירוח לתקופות קצרות',
    icon: '🏨',
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    keywords: ['מלון', 'מלונות', 'מתחם', 'אירוח'],
  },
  {
    id: 'long-term-swap',
    label: 'דירות להחלפה לטווח ארוך',
    short: 'דירות להחלפה ארוך',
    description: 'משפחות שמחפשות החלפת דירות',
    icon: '🔄',
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    keywords: ['החלפה', 'החלפת דירה'],
  },
  {
    id: 'long-term-rent',
    label: 'דירות ויחידות להשכרה לטווח ארוך',
    short: 'השכרה ארוכה',
    description: 'דירות ויחידות להשכרה לתקופות ארוכות',
    icon: '🏠',
    image:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    keywords: ['ארוך', 'טווח ארוך', 'שנתית'],
  },
];

export function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

export function apartmentMatchesCategory(apartment, categoryId) {
  if (!categoryId) return true;
  if (apartment.category === categoryId) return true;
  const cat = findCategory(categoryId);
  if (!cat) return true;
  const haystack = [
    apartment.title,
    apartment.description,
    apartment.rental_period,
    apartment.property_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return cat.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
