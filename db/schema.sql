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
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner',
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
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_apartments_status (status),
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
