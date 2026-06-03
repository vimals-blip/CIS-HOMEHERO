-- Migration 001: New tables for HomeHero platform

CREATE TABLE IF NOT EXISTS otp_requests (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_phone (phone)
);

CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  full_address TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_per_month DECIMAL(12,2) NOT NULL,
  sessions_per_month INT NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status ENUM('ACTIVE','EXHAUSTED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  sessions_remaining INT NOT NULL,
  renewal_date DATE NOT NULL,
  auto_renew TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE TABLE IF NOT EXISTS service_packages (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_pkg_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_addons (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  additional_price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_addon_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_status_log (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  status ENUM('ONLINE','OFFLINE','BUSY') NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_psl_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('REQUESTED','PROCESSING','PAID','FAILED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  bank_account_number VARCHAR(255),
  bank_ifsc VARCHAR(255),
  bank_name VARCHAR(255),
  rejection_reason TEXT,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  CONSTRAINT fk_payout_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_booking (booking_id),
  CONSTRAINT fk_chat_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel ENUM('PUSH','SMS','IN_APP') NOT NULL,
  status ENUM('SENT','FAILED') NOT NULL DEFAULT 'SENT',
  message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id)
);

-- ALTER TABLE statements (with IF NOT EXISTS where supported)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_id VARCHAR(50) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addon_ids JSON NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) NULL;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS onboarding_status ENUM('INCOMPLETE','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'INCOMPLETE';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL;

-- Indexes (CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON bookings(provider_id, scheduled_date, scheduled_time, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status, is_verified);
