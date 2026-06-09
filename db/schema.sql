-- ═══════════════════════════════════════════════════════════════
-- סכמה לסביבת הענן (Aiven MySQL)
-- מריצים את הקובץ הזה על מסד הנתונים בענן (ללא CREATE DATABASE).
-- לאחר הרצה, אפשר להריץ את db/seed.sql כדי להזרים את נתוני ההתחלה.
-- ═══════════════════════════════════════════════════════════════

-- ───────── משתמשים ─────────
-- role:
--   owner = משתמש רגיל שיכול לפרסם דירות (חייב לשלם)
--   admin = מנהל המערכת (מאשר/דוחה דירות)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  -- password_hash יכול להיות NULL עבור משתמשים שנרשמו דרך גוגל
  password_hash VARCHAR(255) NULL,
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner',
  -- אימות אימייל: 0 = ממתין לאימות, 1 = מאומת
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  -- שיטת ההרשמה: local (אימייל+סיסמה) או google
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  google_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ───────── דירות ─────────
-- status: pending (ממתין לאישור מנהל), approved (מתפרסם), rejected (נדחה)
-- owner_id: NULL בשורות seed שיובאו מהאקסל
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
  status ENUM('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500),
  approved_at TIMESTAMP NULL,
  -- תוקף הפרסום (מחושב מהתשלום). לאחר תאריך זה המודעה מושעית.
  expires_at DATETIME NULL,
  -- האם נשלחה תזכורת על פקיעת תוקף קרובה (כדי לא לשלוח כפול)
  expiry_reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_apartments_status (status),
  INDEX idx_apartments_expires (expires_at),
  INDEX idx_apartments_owner (owner_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ───────── תמונות דירה (גלריה) ─────────
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
-- 30 ש"ח לחודש לדירה.
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

-- ───────── פניות "צור קשר" ─────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- ───────── מחירון פרסום ומבצעים (ניהול מנהל) ─────────
CREATE TABLE IF NOT EXISTS pricing_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  category ENUM('hosts', 'hotels') NOT NULL DEFAULT 'hosts',
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2) NULL COMMENT 'מחיר להשוואה (קו חוצה), אופציונלי',
  currency VARCHAR(8) NOT NULL DEFAULT 'ILS',
  duration_months INT NOT NULL DEFAULT 1,
  duration_label VARCHAR(100) NULL,
  features_json JSON NOT NULL,
  highlight_type ENUM('none', 'popular', 'premium') NOT NULL DEFAULT 'none',
  badge_text VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pricing_plans_cat_sort (category, sort_order),
  INDEX idx_pricing_plans_active (is_active)
);

CREATE TABLE IF NOT EXISTS pricing_promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  discount_type ENUM('percent', 'flat') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  pricing_plan_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_promo_active_dates (is_active, starts_at, ends_at),
  INDEX idx_promo_plan (pricing_plan_id),
  CONSTRAINT fk_promo_plan FOREIGN KEY (pricing_plan_id) REFERENCES pricing_plans (id) ON DELETE CASCADE
);
