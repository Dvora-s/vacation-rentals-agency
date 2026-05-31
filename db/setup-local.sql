-- ═══════════════════════════════════════════════════════════════
-- התקנה מלאה: MySQL מקומי (XAMPP / MySQL Workbench / phpMyAdmin)
-- מריצים את הקובץ פעם אחת — יוצר DB, טבלאות ונתוני דוגמה.
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS vacation_rentals
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vacation_rentals;

-- ───────── משתמשים ─────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ───────── דירות ─────────
CREATE TABLE IF NOT EXISTS apartments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NULL,
  catalog_number INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  property_type VARCHAR(100) DEFAULT 'דירה',
  rental_period VARCHAR(100) DEFAULT 'כל השנה',
  price_per_night DECIMAL(10, 2) NOT NULL,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  max_guests INT NOT NULL DEFAULT 2,
  rating DECIMAL(2, 1) DEFAULT 4.5,
  image_url VARCHAR(500),
  owner_name VARCHAR(255),
  owner_phone VARCHAR(50),
  owner_email VARCHAR(255),
  contact_via_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_apartments_status (status),
  INDEX idx_apartments_owner (owner_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ───────── תמונות דירה ─────────
CREATE TABLE IF NOT EXISTS apartment_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_apartment_images_apt (apartment_id, sort_order),
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
);

-- ───────── תשלומים על פרסום דירה ─────────
CREATE TABLE IF NOT EXISTS listing_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id INT NOT NULL,
  user_id INT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'ILS',
  months INT NOT NULL DEFAULT 1,
  status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) DEFAULT 'manual',
  provider_reference VARCHAR(255),
  paid_at TIMESTAMP NULL,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ───────── הזמנות ─────────
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id INT NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
);

-- ───────── איפוס נתונים ─────────
DELETE FROM listing_payments;
DELETE FROM bookings;
DELETE FROM apartment_images;
DELETE FROM apartments;
DELETE FROM users;

-- ───────── משתמש אדמין דיפולטיבי ─────────
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('מנהל המערכת', 'admin@nofesh.local', NULL,
 '$2b$12$iGMomoZpvjlg5uOPHGr23OyQdC9j2Ir.vy4AS/OriTno3aHknEV2i',
 'admin');

-- ───────── 5 דירות ההתחלה ─────────
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
(1, '/apartments/1/1.png', 0),
(1, '/apartments/1/1-1.png', 1),

(2, '/apartments/16/16.png', 0),
(2, '/apartments/16/16-1.png', 1),
(2, '/apartments/16/16-2.png', 2),
(2, '/apartments/16/16-3.png', 3),
(2, '/apartments/16/16-4.png', 4),

(3, '/apartments/11/11.jpg', 0),
(3, '/apartments/11/11-1.jpg', 1),
(3, '/apartments/11/11-2.jpg', 2),
(3, '/apartments/11/11-3.jpg', 3),

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

(5, '/apartments/51/51.jpeg', 0),
(5, '/apartments/51/51-1.jpeg', 1),
(5, '/apartments/51/51-2.jpeg', 2),
(5, '/apartments/51/51-3.jpeg', 3),
(5, '/apartments/51/51-4.jpeg', 4),
(5, '/apartments/51/51-5.jpeg', 5),
(5, '/apartments/51/51-6.jpeg', 6),
(5, '/apartments/51/51-7.jpeg', 7);

SELECT 'apartments' AS t, COUNT(*) AS n FROM apartments
UNION ALL SELECT 'apartment_images', COUNT(*) FROM apartment_images
UNION ALL SELECT 'users', COUNT(*) FROM users;
