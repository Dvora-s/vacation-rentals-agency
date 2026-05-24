-- Initial schema for vacation rentals agency
-- Run this script against your Aiven MySQL database

CREATE TABLE IF NOT EXISTS apartments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  max_guests INT NOT NULL DEFAULT 2,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id INT NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
);
