-- מחירון פרסום — תוכניות ומבצעים
CREATE TABLE IF NOT EXISTS pricing_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'ILS',
  duration_months INT NOT NULL DEFAULT 1,
  listing_slots INT NOT NULL DEFAULT 1,
  duration_label VARCHAR(255) NULL,
  features_json JSON NOT NULL,
  highlight_type VARCHAR(20) NOT NULL DEFAULT 'none',
  badge_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pricing_category_sort (category, sort_order)
);

CREATE TABLE IF NOT EXISTS pricing_promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  pricing_plan_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_promo_plan (pricing_plan_id),
  INDEX idx_promo_active_dates (is_active, starts_at, ends_at)
);
