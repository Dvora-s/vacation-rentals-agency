-- ═══════════════════════════════════════════════════════════════
-- נתוני התחלה — הריצי אחרי schema.sql (או setup-local.sql).
-- מוסיף משתמש אדמין דיפולטיבי + 5 דירות ההתחלה עם גלריות תמונות.
-- ═══════════════════════════════════════════════════════════════

USE vacation_rentals;

DELETE FROM listing_payments;
DELETE FROM bookings;
DELETE FROM apartment_images;
DELETE FROM apartments;
DELETE FROM users;

-- ───────── משתמש אדמין דיפולטיבי ─────────
-- אימייל: admin@nofesh.local
-- סיסמה: Admin1234!  (החליפי בכניסה הראשונה)
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('מנהל המערכת', 'admin@nofesh.local', NULL,
 '$2b$12$iGMomoZpvjlg5uOPHGr23OyQdC9j2Ir.vy4AS/OriTno3aHknEV2i',
 'admin');

-- ───────── 5 דירות ההתחלה (מתוך ה-Sheet שבזיפ התמונות) ─────────
INSERT INTO apartments (
  id, catalog_number, title, description, location, address,
  property_type, rental_period, price_per_night,
  bedrooms, bathrooms, max_guests, rating, image_url,
  owner_name, owner_phone, owner_email, contact_via_whatsapp,
  is_available, status, approved_at
) VALUES
( 1, 1,
  'דירה ברמה ד3, בית שמש',
  'דירה של נחמה כץ ברמה ד3, בית שמש. עד 7 נפשות, 2 חדרי שינה. להשכרה בעיקר בבין הזמנים ופסח.',
  'בית שמש', 'תלמוד בבלי 6, רמה ד3, בית שמש',
  'דירה', 'כל השנה', 750.00,
  2, 1, 7, 4.5, '/apartments/1/1.png',
  'נחמה כץ', '058-3282144', 'nbf1001@gmail.com', FALSE,
  TRUE, 'approved', CURRENT_TIMESTAMP ),

( 2, 16,
  'דירה ברמה ג1, בית שמש',
  'דירה של פנינה שון ברמה ג1, בית שמש. עד 4 נפשות, 2 חדרי שינה.',
  'בית שמש', 'רמה ג1, בית שמש',
  'דירה', 'כל השנה', 650.00,
  2, 1, 4, 4.5, '/apartments/16/16.png',
  'פנינה שון', '053-8882145', 'pninaschoen@gmail.com', FALSE,
  TRUE, 'approved', CURRENT_TIMESTAMP ),

( 3, 11,
  'דירה ברמה ד2 (ריש לקיש), בית שמש',
  'דירה של מירי הרץ בריש לקיש רמה ד2, בית שמש. עד 10 נפשות, 3 חדרי שינה.',
  'בית שמש', 'ריש לקיש רמה ד2, בית שמש',
  'דירה', 'כל השנה', 8000.00,
  3, 2, 10, 4.5, '/apartments/11/11.jpg',
  'מירי הרץ', '052-7696347', 'mirif101@gmail.com', FALSE,
  TRUE, 'approved', CURRENT_TIMESTAMP ),

( 4, 50,
  'וילה ביצחק נפחא ד4, בית שמש',
  'וילה מרווחת של יוסף ביצחק נפחא, רמה ד4, בית שמש. עד 12 נפשות, 5 חדרי שינה.',
  'בית שמש', 'יצחק נפחא, רמה ד4, בית שמש',
  'וילה', 'כל השנה', 3500.00,
  5, 3, 12, 4.7, '/apartments/50/50.jpeg',
  'יוסף', NULL, NULL, TRUE,
  TRUE, 'approved', CURRENT_TIMESTAMP ),

( 5, 51,
  'וילה ביצחק נפחא ד4, בית שמש',
  'וילה של מוישי ביצחק נפחא, רמה ד4, בית שמש. עד 14 נפשות, 5 חדרי שינה.',
  'בית שמש', 'יצחק נפחא, רמה ד4, בית שמש',
  'וילה', 'כל השנה', 3300.00,
  5, 3, 14, 4.7, '/apartments/51/51.jpeg',
  'מוישי', NULL, NULL, TRUE,
  TRUE, 'approved', CURRENT_TIMESTAMP );

-- ───────── גלריית תמונות ─────────
INSERT INTO apartment_images (apartment_id, image_url, sort_order) VALUES
-- דירה 1 (קטלוג 1)
(1, '/apartments/1/1.png', 0),
(1, '/apartments/1/1-1.png', 1),

-- דירה 2 (קטלוג 16)
(2, '/apartments/16/16.png', 0),
(2, '/apartments/16/16-1.png', 1),
(2, '/apartments/16/16-2.png', 2),
(2, '/apartments/16/16-3.png', 3),
(2, '/apartments/16/16-4.png', 4),

-- דירה 3 (קטלוג 11)
(3, '/apartments/11/11.jpg', 0),
(3, '/apartments/11/11-1.jpg', 1),
(3, '/apartments/11/11-2.jpg', 2),
(3, '/apartments/11/11-3.jpg', 3),

-- דירה 4 (קטלוג 50)
(4, '/apartments/50/50.jpeg', 0),
(4, '/apartments/50/50-1.jpeg', 1),
(4, '/apartments/50/50-2.jpeg', 2),
(4, '/apartments/50/50-3.jpeg', 3),
(4, '/apartments/50/50-4.jpeg', 4),
(4, '/apartments/50/50-5.jpeg', 5),
(4, '/apartments/50/50-6.jpeg', 6),
(4, '/apartments/50/50-7.jpeg', 7),
(4, '/apartments/50/50-8.jpeg', 8),
(4, '/apartments/50/50-9.jpeg', 9),
(4, '/apartments/50/50-10.jpeg', 10),
(4, '/apartments/50/50-11.jpeg', 11),
(4, '/apartments/50/50-12.jpeg', 12),

-- דירה 5 (קטלוג 51)
(5, '/apartments/51/51.jpeg', 0),
(5, '/apartments/51/51-1.jpeg', 1),
(5, '/apartments/51/51-2.jpeg', 2),
(5, '/apartments/51/51-3.jpeg', 3),
(5, '/apartments/51/51-4.jpeg', 4),
(5, '/apartments/51/51-5.jpeg', 5),
(5, '/apartments/51/51-6.jpeg', 6),
(5, '/apartments/51/51-7.jpeg', 7);

SELECT COUNT(*) AS total_apartments FROM apartments;
SELECT COUNT(*) AS total_images FROM apartment_images;
