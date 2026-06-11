-- ═══════════════════════════════════════════════════════════════
-- מחירון ומבצעים (הרצה על Aiven / MySQL קיים)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  -- category: 'hosts' | 'hotels' (נאכף באפליקציה)
  category VARCHAR(20) NOT NULL DEFAULT 'hosts',
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2) NULL COMMENT 'מחיר להשוואה (קו חוצה), אופציונלי',
  currency VARCHAR(8) NOT NULL DEFAULT 'ILS',
  duration_months INT NOT NULL DEFAULT 1,
  duration_label VARCHAR(100) NULL COMMENT 'טקסט חופשי במקום "ל-X חודשים"',
  features_json JSON NOT NULL COMMENT 'מערך מחרוזות: ["תכונה 1", ...]',
  -- highlight_type: 'none' | 'popular' | 'premium' (נאכף באפליקציה)
  highlight_type VARCHAR(20) NOT NULL DEFAULT 'none',
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
  -- discount_type: 'percent' | 'flat' (נאכף באפליקציה)
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  pricing_plan_id INT NULL COMMENT 'NULL = מבצע גלובלי על כל המסלולים הפעילים',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_promo_active_dates (is_active, starts_at, ends_at),
  INDEX idx_promo_plan (pricing_plan_id),
  CONSTRAINT fk_promo_plan FOREIGN KEY (pricing_plan_id) REFERENCES pricing_plans (id) ON DELETE CASCADE
);
