-- נתוני התחלה למחירון (אופציונלי — הריצו אחרי pricing_tables.sql / schema.sql)
-- INSERT IGNORE — לא יכפול אם ה-slugs כבר קיימים

INSERT IGNORE INTO pricing_plans
(slug, category, name, description, price, compare_at_price, currency, duration_months, duration_label, features_json, highlight_type, badge_text, sort_order, is_active)
VALUES
(
  'host-1m',
  'hosts',
  'חודש',
  NULL,
  30.00,
  NULL,
  'ILS',
  1,
  NULL,
  JSON_ARRAY(
    'קבלת הודעות מהאתר למייל',
    'המלצות ודירוג הדירה',
    'אזור אישי באתר',
    'חודש פרסום אחד'
  ),
  'none',
  NULL,
  1,
  TRUE
),
(
  'host-2m',
  'hosts',
  '2 חודשים',
  NULL,
  60.00,
  NULL,
  'ILS',
  2,
  NULL,
  JSON_ARRAY(
    'קבלת הודעות מהאתר למייל',
    'המלצות ודירוג הדירה',
    'אזור אישי באתר',
    '2 חודשי פרסום'
  ),
  'popular',
  'הכי פופולרי',
  2,
  TRUE
),
(
  'host-12m',
  'hosts',
  '12 חודשים',
  NULL,
  330.00,
  NULL,
  'ILS',
  12,
  NULL,
  JSON_ARRAY(
    'קבלת הודעות מהאתר למייל',
    'המלצות ודירוג הדירה',
    'אזור אישי באתר',
    '12 חודשי פרסום',
    'ניתן לפרוס ל-12 תשלומים'
  ),
  'none',
  NULL,
  3,
  TRUE
),
(
  'hotel-1m',
  'hotels',
  'פרסום לחודש',
  NULL,
  80.00,
  NULL,
  'ILS',
  1,
  NULL,
  JSON_ARRAY(
    'קבלת הודעות מהאתר למייל',
    'המלצות ודירוג',
    'תמיד בראש התוצאות',
    'אזור אישי באתר',
    'חודש פרסום',
    'פריסה לתשלומים'
  ),
  'none',
  NULL,
  1,
  TRUE
),
(
  'hotel-12m',
  'hotels',
  'פרסום לשנה',
  NULL,
  550.00,
  800.00,
  'ILS',
  12,
  NULL,
  JSON_ARRAY(
    'קבלת הודעות מהאתר למייל',
    'המלצות ודירוג',
    'תמיד בראש התוצאות',
    'אזור אישי באתר',
    '12 חודשי פרסום',
    'ניתן לפרוס ל-12 תשלומים'
  ),
  'premium',
  'חיסכון משמעותי',
  2,
  TRUE
);
