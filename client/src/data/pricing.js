// מסלולי תמחור לפרסום נכס — מקור אמת יחיד בצד הלקוח.
// tier 'standard' — דירות/יחידות אירוח/צימרים.
// tier 'premium'  — סוג נכס "מתחמי אירוח".

// סוג הנכס שמחויב בתעריף פרימיום.
export const COMPLEX_PROPERTY_TYPE = 'מתחמי אירוח';
// מעל כמות מיטות זו — חובה לבחור סוג נכס "מתחמי אירוח".
export const MAX_GUESTS_NON_COMPLEX = 40;

export const STANDARD_PLANS = [
  { id: 'std-1', title: 'חודש', months: 1, price: 30 },
  { id: 'std-2', title: '2 חודשים', months: 2, price: 60, badge: 'הכי פופולרי', variant: 'featured' },
  { id: 'std-12', title: '12 חודשים', months: 12, price: 330 },
];

export const PREMIUM_PLANS = [
  { id: 'prm-1', title: 'פרסום לחודש', months: 1, price: 80 },
  {
    id: 'prm-12',
    title: 'פרסום לשנה',
    months: 12,
    price: 550,
    originalPrice: 800,
    badge: 'חיסכון משמעותי',
    variant: 'premium',
  },
];

// האם הנכס מחויב בתעריף פרימיום — לפי סוג הנכס "מתחמי אירוח".
export function requiresPremium(apartment) {
  if (!apartment) return false;
  return apartment.property_type === COMPLEX_PROPERTY_TYPE;
}

// מחזיר את הסכום הכולל למסלול לפי tier ומספר חודשים.
export function getPlanAmount(tier, months) {
  const plans = tier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
  const exact = plans.find((p) => p.months === months);
  if (exact) return exact.price;
  const perMonth = tier === 'premium' ? 80 : 30;
  return perMonth * Math.max(1, Number(months) || 1);
}

export function monthsLabel(months) {
  const n = Number(months) || 1;
  return n === 1 ? 'חודש' : `${n} חודשים`;
}
