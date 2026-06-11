-- שאלות נפוצות — ניהול מנהל, תצוגה ציבורית
CREATE TABLE IF NOT EXISTS faq_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- section: 'renters' (שוכרים) | 'hosts' (מארחים) — נאכף באפליקציה
  section VARCHAR(20) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faq_section_sort (section, sort_order)
);
