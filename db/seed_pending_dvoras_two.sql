-- ═══════════════════════════════════════════════════════════════
-- שתי דירות לדוגמה במצב pending (ממתינות לאישור מנהל)
-- בעלים: dvoras127@gmail.com | תמונות: client/public/apartments/201, 202
--
-- הרצה (התאם שם DB אם שונה אצלך):
--   mysql -u USER -p vacation_rentals < db/seed_pending_dvoras_two.sql
--
-- אידמפוטנטי לפי catalog_number 201 ו-202 (מוחק רשומות קודמות עם אותם מספרים).
-- ═══════════════════════════════════════════════════════════════

-- אם מסד הנתונים שלך נקרא אחרת (למשל railway), ערוך את השורה הבאה.
USE vacation_rentals;

DELETE b FROM bookings b
INNER JOIN apartments a ON b.apartment_id = a.id
WHERE a.catalog_number IN (201, 202);

DELETE lp FROM listing_payments lp
INNER JOIN apartments a ON lp.apartment_id = a.id
WHERE a.catalog_number IN (201, 202);

DELETE FROM apartments WHERE catalog_number IN (201, 202);

INSERT IGNORE INTO users (full_name, email, phone, password_hash, role, email_verified)
VALUES ('דורית וורד', 'dvoras127@gmail.com', '050-5550198', NULL, 'owner', 1);

SET @owner_id := (SELECT id FROM users WHERE email = 'dvoras127@gmail.com' LIMIT 1);

INSERT INTO apartments (
  owner_id, catalog_number, title, description, location, address,
  property_type, rental_period, price_per_night,
  bedrooms, bathrooms, max_guests, rating, image_url,
  owner_name, owner_phone, owner_email, contact_via_whatsapp,
  is_available, status, approved_at
) VALUES
(
  @owner_id, 201,
  'דירת יוקרה עם נוף פנורמי — רמת גן',
  'דירה מרווחת ומוארת בסגנון מודרני: סלון פתוח, פינת אוכל, מרפסת גדולה עם נוף עיר וים. מתאימה למשפחות ולקבוצות קטנות. מרוהטת ברמה גבוהה, מיזוג בכל החדרים, מטבח מאובזר.',
  'רמת גן', 'שדרות ביאליק 42, רמת גן',
  'דירה', 'כל השנה', 950.00,
  3, 2, 6, 4.5, '/apartments/201/201.png',
  'דורית וורד', '050-5550198', 'dvoras127@gmail.com', FALSE,
  TRUE, 'pending', NULL
),
(
  @owner_id, 202,
  'פנטהאוז מודרני עם מרפסת שמש — הרצליה פיתוח',
  'יחידת דיור רחבה בקו פתוח: סלון, מטבח גורמה עם ארונות מעוצבים וחלל חיצוני גדול. תאורת לד שקועה, ריצוף פורצלן, מתאים לאירוח ולשהייה ארוכה. קרוב לים ולמרכזי קניות.',
  'הרצליה', 'הנשיא 18, הרצליה פיתוח',
  'דירה', 'כל השנה', 1180.00,
  4, 2, 8, 4.6, '/apartments/202/202.png',
  'דורית וורד', '050-5550198', 'dvoras127@gmail.com', FALSE,
  TRUE, 'pending', NULL
);

INSERT INTO apartment_images (apartment_id, image_url, sort_order)
SELECT id, '/apartments/201/201.png', 0 FROM apartments WHERE catalog_number = 201
UNION ALL
SELECT id, '/apartments/201/201-1.png', 1 FROM apartments WHERE catalog_number = 201
UNION ALL
SELECT id, '/apartments/202/202.png', 0 FROM apartments WHERE catalog_number = 202
UNION ALL
SELECT id, '/apartments/202/202-1.png', 1 FROM apartments WHERE catalog_number = 202;

SELECT id, catalog_number, title, status, owner_email FROM apartments WHERE catalog_number IN (201, 202);
