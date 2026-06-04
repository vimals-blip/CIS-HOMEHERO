-- ============================================================================
-- Snabbit-style on-demand household help — database schema
-- ============================================================================
-- Model: customers book a curated household service (cleaning, dishwashing,
-- laundry, etc.) for a chosen DURATION, either INSTANTLY (expert arrives in
-- ~minutes) or SCHEDULED for later. A trained, verified expert is assigned and
-- the booking moves through a live-tracked status flow.
--
-- The auth foundation (users, profiles, profile_contacts, user_roles) is kept.
-- All domain tables are dropped and rebuilt so the schema can evolve cleanly.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ticket_messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS expert_documents;
DROP TABLE IF EXISTS booking_events;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS withdrawal_requests;
DROP TABLE IF EXISTS coupon_usage;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customer_wallet;
DROP TABLE IF EXISTS expert_wallet;
DROP TABLE IF EXISTS expert_services;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS experts;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS coupons;
-- Legacy trade-marketplace tables (removed in the Snabbit rebuild)
DROP TABLE IF EXISTS provider_categories;
DROP TABLE IF EXISTS provider_documents;
DROP TABLE IF EXISTS provider_payouts;
DROP TABLE IF EXISTS provider_wallet;
DROP TABLE IF EXISTS provider_status_log;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS service_packages;
DROP TABLE IF EXISTS service_addons;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS otp_requests;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Auth foundation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure is_blocked exists on a pre-existing users table (skipped if present).
ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(255),
  avatar_url TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ensure phone exists on a pre-existing profiles table (skipped if already present)
ALTER TABLE profiles ADD COLUMN phone VARCHAR(20);

CREATE TABLE IF NOT EXISTS profile_contacts (
  user_id VARCHAR(50) NOT NULL PRIMARY KEY,
  phone VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_contacts_profile FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  role ENUM('CUSTOMER','EXPERT','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Migrate the role enum on a pre-existing table: legacy PROVIDER rows become EXPERT.
ALTER TABLE user_roles MODIFY COLUMN role ENUM('CUSTOMER','PROVIDER','EXPERT','ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER';
UPDATE user_roles SET role = 'EXPERT' WHERE role = 'PROVIDER';
ALTER TABLE user_roles MODIFY COLUMN role ENUM('CUSTOMER','EXPERT','ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER';

-- ----------------------------------------------------------------------------
-- OTP login + refresh tokens (persistent auth tables — never dropped)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_verifications (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('LOGIN') NOT NULL DEFAULT 'LOGIN',
  attempts INT NOT NULL DEFAULT 0,
  consumed TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_phone (phone, created_at)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_refresh_user (user_id)
);

-- ----------------------------------------------------------------------------
-- Services — curated household tasks, priced per hour of help
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  tagline VARCHAR(255),
  description TEXT,
  icon_name VARCHAR(100),
  image_url TEXT,
  rate_per_hour DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_hours DECIMAL(3,1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Experts — the trained, verified workforce
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experts (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  gender ENUM('FEMALE','MALE','OTHER') NOT NULL DEFAULT 'FEMALE',
  bio TEXT,
  experience_years INT NOT NULL DEFAULT 0,
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  total_jobs INT NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_trained TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('ONLINE','OFFLINE','BUSY') NOT NULL DEFAULT 'OFFLINE',
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  service_pincodes JSON,
  onboarding_status ENUM('INCOMPLETE','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_experts_profile FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_experts_status (status, is_verified)
);

CREATE TABLE IF NOT EXISTS expert_services (
  expert_id VARCHAR(50) NOT NULL,
  service_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (expert_id, service_id),
  CONSTRAINT fk_expert_services_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
  CONSTRAINT fk_expert_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expert_wallet (
  expert_id VARCHAR(50) NOT NULL PRIMARY KEY,
  available_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_expert_wallet_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
);

-- KYC documents uploaded by experts (file_url points at S3 in production)
CREATE TABLE IF NOT EXISTS expert_documents (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  expert_id VARCHAR(50) NOT NULL,
  type ENUM('AADHAAR','PAN','SELFIE','OTHER') NOT NULL,
  file_url TEXT NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  review_note VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expert_documents_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
  INDEX idx_expert_documents_expert (expert_id)
);

-- ----------------------------------------------------------------------------
-- Customer saved addresses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL DEFAULT 'Home',
  flat VARCHAR(255),
  address_line TEXT NOT NULL,
  landmark VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_addresses_customer (customer_id)
);

-- ----------------------------------------------------------------------------
-- Coupons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  type ENUM('FLAT','PERCENT') NOT NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  max_uses INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Bookings — instant or scheduled, live-tracked
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  expert_id VARCHAR(50),
  service_id VARCHAR(50) NOT NULL,
  booking_type ENUM('INSTANT','SCHEDULED') NOT NULL DEFAULT 'INSTANT',
  scheduled_at DATETIME,
  duration_hours DECIMAL(3,1) NOT NULL DEFAULT 1,
  status ENUM('SEARCHING','ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SEARCHING',
  eta_minutes INT,
  address_snapshot TEXT NOT NULL,
  pincode VARCHAR(10),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  base_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  expert_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method ENUM('CASH','WALLET','UPI','CARD') NOT NULL DEFAULT 'CASH',
  payment_status ENUM('PENDING','PAID','REFUNDED') NOT NULL DEFAULT 'PENDING',
  coupon_code VARCHAR(255),
  notes TEXT,
  cancel_reason TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  INDEX idx_bookings_customer (customer_id, status),
  INDEX idx_bookings_expert (expert_id, status)
);

-- Booking status timeline for live tracking
CREATE TABLE IF NOT EXISTS booking_events (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  status ENUM('SEARCHING','ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL,
  message VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_events_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_booking_events_booking (booking_id, created_at)
);

-- ----------------------------------------------------------------------------
-- Reviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL UNIQUE,
  expert_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Payments & wallet transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('CASH','UPI','CARD','WALLET') NOT NULL DEFAULT 'CASH',
  status ENUM('CREATED','PAID','REFUNDED') NOT NULL DEFAULT 'CREATED',
  paid_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  booking_id VARCHAR(50),
  type ENUM('CREDIT','DEBIT') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_transactions_user (user_id, created_at)
);

-- ----------------------------------------------------------------------------
-- Customer wallet — prepaid balance used to pay for bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_wallet (
  user_id VARCHAR(50) NOT NULL PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_added DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_wallet_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Track each coupon redemption (one row per use, per customer)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  coupon_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  booking_id VARCHAR(50),
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_coupon_usage_user (user_id, coupon_id)
);

-- ----------------------------------------------------------------------------
-- Payment gateway lifecycle (Razorpay order → verify), separate from `payments`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  booking_id VARCHAR(50),
  order_id VARCHAR(120) NOT NULL,
  payment_id VARCHAR(120),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  purpose ENUM('WALLET_TOPUP','BOOKING') NOT NULL DEFAULT 'WALLET_TOPUP',
  provider ENUM('MOCK','RAZORPAY') NOT NULL DEFAULT 'MOCK',
  status ENUM('CREATED','PAID','FAILED') NOT NULL DEFAULT 'CREATED',
  signature VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_paytxn_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_paytxn_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_paytxn_order (order_id),
  INDEX idx_paytxn_user (user_id, created_at)
);

-- ----------------------------------------------------------------------------
-- Expert withdrawal requests (settlements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  expert_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('REQUESTED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  bank_account VARCHAR(255),
  bank_ifsc VARCHAR(255),
  note VARCHAR(255),
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  CONSTRAINT fk_withdrawal_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
  INDEX idx_withdrawal_expert (expert_id, status)
);

-- ----------------------------------------------------------------------------
-- Support tickets + threaded messages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  booking_id VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
  priority ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_tickets_user (user_id, status)
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  is_staff TINYINT(1) NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticketmsg_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticketmsg_ticket (ticket_id, created_at)
);

-- ----------------------------------------------------------------------------
-- CMS + platform configuration (persistent — never dropped)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_pages (
  slug VARCHAR(100) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value TEXT,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Notifications (in-app + push) — persistent
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body VARCHAR(500),
  booking_id VARCHAR(50),
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, is_read, created_at)
);

CREATE TABLE IF NOT EXISTS device_tokens (
  token VARCHAR(255) NOT NULL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'web',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_device_tokens_user (user_id)
);
