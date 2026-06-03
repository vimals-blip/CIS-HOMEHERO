# Design Document — Snabbit Clone Platform (HomeHero)

## Overview

HomeHero is a full-stack on-demand home services marketplace. The architecture is a React 19 SPA
(TanStack Router + TanStack Query) backed by an Express/Node.js REST API and a MySQL database.
The design below covers all 34 requirements across security, booking, provider management,
customer features, real-time capabilities, and admin operations.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    Browser (SPA)                  │
│  TanStack Router  │  TanStack Query  │  React 19  │
└──────────────┬───────────────────────────────────┘
               │ HTTP REST + WebSocket
┌──────────────▼───────────────────────────────────┐
│              Express API  (port 4001)             │
│  Auth MW  │  Rate Limiter  │  Sanitizer           │
│  Dispatcher  │  Wallet Ledger  │  Coupon Validator │
│  Notification Service  │  Search Engine           │
└──────────────┬───────────────────────────────────┘
               │ mysql2 pool
┌──────────────▼───────────────────────────────────┐
│               MySQL 8 Database                    │
└──────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Frontend Architecture

### Router Structure (TanStack Router file-based)

```
src/routes/
  __root.tsx                   — Root layout: Navbar, QueryClient, AuthProvider
  index.tsx                    — Home / Landing page
  auth.login.tsx               — Email+password login (+ Phone OTP tab)
  auth.signup-customer.tsx     — Customer registration
  auth.signup-provider.tsx     — Provider registration
  book.$categoryId.tsx         — 3-step booking wizard
  bookings.tsx                 — Customer booking history (tabs: Upcoming/Completed/Cancelled)
  profile.tsx                  — Customer profile management
  providers.$providerId.tsx    — Public provider profile + reviews
  search.tsx                   — Search results page
  provider/
    index.tsx                  — Provider dashboard (stats, online toggle, recent jobs)
    jobs.tsx                   — Provider job board (New/Active/Completed tabs)
    onboarding.tsx             — Multi-step onboarding wizard (new)
    earnings.tsx               — Earnings, wallet, payout requests (new)
  admin/
    index.tsx                  — Admin overview (revenue, stats, charts)
    kyc.tsx                    — KYC document review queue (new)
    providers.tsx              — All providers management (new)
    bookings.tsx               — All bookings table (new)
    categories.tsx             — Category + package + addon management (new)
    coupons.tsx                — Coupon CRUD (new)
    payouts.tsx                — Payout approval (new)
    users.tsx                  — User management (new)
```

### State Management

- **Server state**: TanStack Query (all API calls, caching, refetch-on-focus)
- **Auth state**: `AuthContext` (JWT parsed from localStorage, dispatches on change)
- **City state**: `localStorage('homehero_city')` + React context for global city filter
- **Booking wizard state**: local `useState` within the booking route component

### Key Shared Components

```
src/components/
  layout/
    Navbar.tsx          — Sticky glassmorphism nav with city selector + search
    Footer.tsx          — Links, app badges, social (new)
  provider/
    ProviderCard.tsx    — Card with avatar, rating, price, "Book Now"
    ReviewCard.tsx      — Review with stars, date, provider reply
    VerifiedBadge.tsx   — Teal shield-check inline badge
  booking/
    TimeSlotGrid.tsx    — Morning/Afternoon/Evening grouped slots, disabled support
    BookingCard.tsx     — Reusable booking row for history + job board (new)
  shared/
    EmptyState.tsx      — Dashed container, icon, title, CTA
    LoadingSpinner.tsx  — Centered spinner + skeleton variant
    SkeletonCard.tsx    — Shimmer skeleton for provider cards (new)
    StatusBadge.tsx     — Booking status badge with colour map (new)
    StarRating.tsx      — Filled/empty star row (new)
  ui/                   — shadcn/Radix primitives (existing)
```

---

## Backend Architecture

### Middleware Stack (Express)

```
app.use(cors)
app.use(express.json)
app.use(rateLimiter)          — express-rate-limit: 10 req/15 min on /auth/*
app.use(sanitizeMiddleware)   — strips HTML from all string body fields
app.use(authMiddleware)       — JWT verify on all non-public routes
```

### Module Responsibilities

| Module | File | Responsibility |
|---|---|---|
| Auth Middleware | `server/middleware/auth.js` | JWT verify, role check, 401/403 |
| Rate Limiter | `server/middleware/rateLimiter.js` | express-rate-limit per IP + phone |
| Sanitizer | `server/middleware/sanitize.js` | strip-tags on all string fields |
| Dispatcher | `server/dispatcher.js` | auto-assign provider to booking |
| Wallet Ledger | `server/walletLedger.js` | update balances on booking status change |
| Coupon Validator | `server/couponValidator.js` | server-side coupon check + discount calc |
| Review Aggregator | `server/reviewAggregator.js` | recalculate avg_rating after review |
| Notification Service | `server/notificationService.js` | SMS (stub) + FCM push (stub) |
| Search Engine | `server/search.js` | keyword + city search across categories + providers |

### Public Routes (no auth required)

```
GET  /api/v1/health
GET  /api/v1/categories
GET  /api/v1/categories/:id
GET  /api/v1/providers         (with city, category_id, verified, limit, page filters)
GET  /api/v1/provider/:id      (public profile)
GET  /api/v1/reviews           (provider_id filter)
GET  /api/v1/search            (q, city)
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/otp/send
POST /api/v1/auth/otp/verify
```

### Protected Routes (JWT required)

```
GET/PATCH   /api/v1/profile                             — Customer/Provider self
GET         /api/v1/bookings                            — filtered by customer_id or provider_id
POST        /api/v1/bookings                            — Customer only
PATCH       /api/v1/bookings/:id                        — Provider (status) / Customer (cancel)
GET         /api/v1/providers/:id/availability          — public
POST        /api/v1/reviews                             — Customer only
GET         /api/v1/provider-wallet/:id                 — Provider self
POST        /api/v1/payouts                             — Provider only
GET/POST    /api/v1/addresses                           — Customer only
PATCH/DELETE /api/v1/addresses/:id                     — Customer self
POST        /api/v1/coupons/validate                    — Customer only
GET         /api/v1/providers/:id/documents             — Provider self
POST        /api/v1/providers/:id/documents             — Provider self
PATCH       /api/v1/provider/status                     — Provider only
```

### Admin-Only Routes

```
GET         /api/v1/admin/overview
GET         /api/v1/admin/providers
GET         /api/v1/admin/users
GET/POST    /api/v1/admin/coupons
PATCH       /api/v1/admin/coupons/:id
POST        /api/v1/admin/categories
PATCH       /api/v1/admin/categories/:id
PATCH       /api/v1/providers/:id                       — verify/reject
PATCH       /api/v1/providers/:id/documents/:docId      — approve/reject doc
GET         /api/v1/admin/payouts
PATCH       /api/v1/admin/payouts/:id                   — approve/reject
```

---

## Data Models

### New Tables

```sql
-- Phone OTP authentication
CREATE TABLE otp_requests (
  id VARCHAR(50) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_phone (phone)
);

-- Customer saved addresses
CREATE TABLE addresses (
  id VARCHAR(50) PRIMARY KEY,
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

-- Subscription plans
CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_per_month DECIMAL(12,2) NOT NULL,
  sessions_per_month INT NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer subscriptions
CREATE TABLE subscriptions (
  id VARCHAR(50) PRIMARY KEY,
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

-- Service packages per category
CREATE TABLE service_packages (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_pkg_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Service add-ons per category
CREATE TABLE service_addons (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  additional_price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_addon_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Provider online/offline status log
CREATE TABLE provider_status_log (
  id VARCHAR(50) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  status ENUM('ONLINE','OFFLINE','BUSY') NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_psl_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- Payout requests
CREATE TABLE payouts (
  id VARCHAR(50) PRIMARY KEY,
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

-- In-app chat messages
CREATE TABLE chat_messages (
  id VARCHAR(50) PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_booking (booking_id),
  CONSTRAINT fk_chat_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Notification records
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel ENUM('PUSH','SMS','IN_APP') NOT NULL,
  status ENUM('SENT','FAILED') NOT NULL DEFAULT 'SENT',
  message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id)
);
```

### Existing Table Alterations

```sql
-- Add package and addon columns to bookings
ALTER TABLE bookings
  ADD COLUMN package_id VARCHAR(50) NULL,
  ADD COLUMN addon_ids JSON NULL,
  ADD COLUMN pin_code VARCHAR(10) NULL AFTER address;

-- Add onboarding status to providers
ALTER TABLE providers
  ADD COLUMN onboarding_status ENUM('INCOMPLETE','SUBMITTED','APPROVED','REJECTED')
    NOT NULL DEFAULT 'INCOMPLETE' AFTER status;

-- Add phone to profiles (denormalised for performance, kept in sync with profile_contacts)
ALTER TABLE profiles
  ADD COLUMN phone VARCHAR(20) NULL AFTER city;
```

---

## Security Design

### Auth Middleware (`server/middleware/auth.js`)

```
function authMiddleware(req, res, next):
  token = req.headers.authorization?.split(' ')[1]
  if not token → return 401 UNAUTHENTICATED
  try:
    payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.user_id, email: payload.email, role: payload.role }
    next()
  catch TokenExpiredError → return 401 TOKEN_INVALID
  catch JsonWebTokenError  → return 401 TOKEN_INVALID

function requireRole(...roles):
  return (req, res, next):
    if not roles.includes(req.user.role) → return 403 FORBIDDEN
    next()
```

### Rate Limiter Design

- Library: `express-rate-limit`
- Login limiter: `windowMs: 15*60*1000, max: 10, keyGenerator: req.ip`
- OTP send limiter: `windowMs: 10*60*1000, max: 5, keyGenerator: req.body.phone`
- Applied only on `/auth/login` and `/auth/otp/send`

### Input Sanitizer Design

```
function sanitizeBody(req, res, next):
  recursively walk req.body
  for each string value: value = stripHtml(value)
  next()

function stripHtml(s): remove <...> tags, on* attributes
```

All SQL queries use `pool.query('... WHERE id = ?', [value])` — no string interpolation.

---

## Dispatcher Design (`server/dispatcher.js`)

```
async function dispatch(bookingData):
  { category_id, pin_code, scheduled_date, scheduled_time } = bookingData

  // Find eligible providers
  providers = await db.query(`
    SELECT p.id, p.avg_rating,
           COUNT(b.id) AS active_count
    FROM providers p
    JOIN provider_categories pc ON pc.provider_id = p.id
    WHERE p.status = 'ONLINE'
      AND p.is_verified = 1
      AND pc.category_id = ?
      AND JSON_CONTAINS(p.pin_codes, JSON_QUOTE(?))
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.provider_id = p.id
          AND b.scheduled_date = ?
          AND b.scheduled_time = ?
          AND b.status IN ('PENDING','CONFIRMED','IN_PROGRESS')
      )
    GROUP BY p.id
    ORDER BY p.avg_rating DESC, active_count ASC
    LIMIT 1
  `, [category_id, pin_code, scheduled_date, scheduled_time])

  if providers.length === 0 → throw NO_PROVIDER_AVAILABLE

  return providers[0].id
```

Provider is set to BUSY when IN_PROGRESS booking exists. After 60s timeout, re-dispatch is
triggered via a setTimeout in the booking creation handler.

---

## Wallet Ledger Design (`server/walletLedger.js`)

Called inside a database transaction whenever booking status changes:

```
ON status → CONFIRMED:
  INSERT INTO provider_wallet (provider_id, pending_balance)
  ON DUPLICATE KEY UPDATE pending_balance = pending_balance + provider_amount

ON status → COMPLETED:
  UPDATE provider_wallet SET
    pending_balance  = pending_balance  - provider_amount,
    available_balance = available_balance + provider_amount,
    total_earned      = total_earned     + provider_amount
  WHERE provider_id = ?
  INSERT INTO transactions (type='CREDIT', user_id=provider_id, amount=provider_amount)

ON status → CANCELLED (after CONFIRMED):
  UPDATE provider_wallet SET
    pending_balance = pending_balance - provider_amount
  WHERE provider_id = ?
  -- Razorpay refund initiated via Payment_Gateway
```

---

## Coupon Validator Design (`server/couponValidator.js`)

```
async function validate(code, amount):
  coupon = await db.query('SELECT * FROM coupons WHERE code = ?', [code])
  if not coupon          → throw COUPON_NOT_FOUND
  if not coupon.is_active → throw COUPON_INACTIVE
  if coupon.expires_at && coupon.expires_at < now() → throw COUPON_EXPIRED
  if coupon.max_uses && coupon.used_count >= coupon.max_uses → throw COUPON_EXHAUSTED

  if coupon.type === 'PERCENT':
    discount = Math.floor(amount * coupon.value / 100)
  else: // FLAT
    discount = Math.min(coupon.value, amount)

  return { discount, total: amount - discount, coupon_id: coupon.id }
```

---

## Review Aggregator Design (`server/reviewAggregator.js`)

```
async function recalculate(provider_id):
  rows = await db.query(
    'SELECT rating FROM reviews WHERE provider_id = ? AND is_flagged = 0',
    [provider_id]
  )
  if rows.length === 0: avg = 0, count = 0
  else:
    avg = (sum of ratings / count).toFixed(2)
  await db.query(
    'UPDATE providers SET avg_rating = ?, review_count = ? WHERE id = ?',
    [avg, rows.length, provider_id]
  )
```

---

## Page-by-Page UI Design

### Home Page (`src/routes/index.tsx`)

**Hero Section**
- Full-viewport-width dark navy-to-teal gradient
- H1: "House Help in 10 Minutes" (large, bold, white)
- Subhead: "Background-verified, trained professionals at your doorstep"
- Pill-shaped search bar: city selector dropdown + service keyword input + Search button
- Three trust badges below search: shield (Verified), clock (10-min), star (Guaranteed)

**Services Grid**
- 2-row horizontal scroll on mobile, 3-col grid on desktop
- Each card: coloured icon, service name, "from ₹X" price, hover lift

**How It Works**
- 3 numbered steps with connecting dashed line
- Step 1: Pick a service → Step 2: Book a slot → Step 3: Pro arrives

**Stats Strip**
- Full-width dark strip: 120K+ Customers, 15K+ Verified Pros, 4.8/5 Rating, 22 Cities

**Top Rated Pros**
- City filter tab row, provider cards grid (6 cards), "View all" link

**Trust / Why HomeHero**
- 6-card grid: Background Verified, Service Guarantee, 24/7 Support, Flexible Slots, Trained Pros, Transparent Pricing

**Testimonials** — 3 quote cards

**Provider CTA** — "Earn ₹25,000+/month as a HomeHero Pro", dark background strip

---

### Booking Flow (`src/routes/book.$categoryId.tsx`)

**Progress bar** — 3 steps with numbered circles and connecting lines

**Step 1 — Choose Provider**
- Sort bar (rating/price/experience)
- Provider cards grid with "Select" button
- Selected provider highlighted with primary border

**Step 2 — Schedule**
- Inline Calendar (left), Time Slot Grid grouped by Morning/Afternoon/Evening (right)
- Address textarea with pin code input
- Notes textarea

**Step 3 — Confirm & Pay**
- Provider mini-card (avatar, name, rating)
- Schedule summary (date, time, address)
- Coupon input row with "Apply" button and success/error feedback
- Price breakdown: service fee, discount, platform fee, total
- Payment method icons (UPI/Card/Netbanking — visual only)
- "Pay ₹X" CTA button (full-width, primary)

---

### My Bookings (`src/routes/bookings.tsx`)

- Tabs: Upcoming | Completed | Cancelled
- Each card: category icon, service name, provider name+avatar, date/time, address, status badge, amount
- COMPLETED card shows: "Rate & Review" button (opens modal)
- PENDING/CONFIRMED card shows: "Cancel" button
- Empty state per tab with appropriate icon and message

---

### Provider Dashboard (`src/routes/provider/index.tsx`)

- Top row: welcome + Online/Offline toggle (prominent pill switch)
- Stats: Today's Earnings | Total Earned | Active Jobs | Avg Rating
- Quick actions grid: View Jobs | Update Profile | Request Payout | Earnings History
- Upcoming jobs list (next 3 jobs)
- Recharts BarChart for earnings by week
- Verification banner (if onboarding_status !== APPROVED)

---

### Provider Jobs (`src/routes/provider/jobs.tsx`)

- Tabs: New | Active | Completed
- Each job card: customer name, service, address, scheduled time, earnings
- New: Accept / Decline buttons
- Active: "Mark Started" → "Mark Completed" progression
- Completed: shows amount earned

---

### Provider Onboarding (`src/routes/provider/onboarding.tsx`)

5-step wizard with progress bar:
1. Personal Details (name, phone, city, bio, experience, hourly_rate)
2. Service Categories (multi-select with custom price per category)
3. Service Area (pin code input with add/remove, max 20)
4. Document Upload (AADHAAR, PAN, BANK — file URL inputs)
5. Review & Submit (summary of all entered data)

Progress persisted in localStorage at each step.

---

### Provider Earnings (`src/routes/provider/earnings.tsx`)

- Wallet summary: Available | Pending | Total Earned
- Payout request form: amount input, bank details display
- Transaction history table
- Recharts LineChart for earnings over time

---

### Admin Dashboard (`src/routes/admin/index.tsx`)

- Stats cards: Revenue, Bookings, Customers, Providers, Pending KYC
- Recharts LineChart: bookings + revenue over last 30 days
- Side navigation tabs to sub-pages (or tab strip at top)

---

### Customer Profile (`src/routes/profile.tsx`)

- Avatar upload + name, phone, city, email display
- Edit form with validation
- Saved addresses list with add/edit/delete/set-default
- Booking summary: total bookings, total spent

---

### Search Results (`src/routes/search.tsx`)

- Two-column results: Categories (left/top) + Providers (right/bottom)
- Filter sidebar: city, min rating, max price
- Provider grid with pagination

---

## Component API

### `TimeSlotGrid`

```tsx
interface TimeSlotGridProps {
  value?: string;
  onChange: (slot: string) => void;
  bookedSlots?: string[];   // disabled slots from availability API
}
```

Slots grouped:
- Morning: 08:00–11:00
- Afternoon: 12:00–15:00
- Evening: 16:00–19:00

Disabled slots rendered with `opacity-40 cursor-not-allowed line-through`.

### `StatusBadge`

```tsx
interface StatusBadgeProps {
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  size?: 'sm' | 'md';
}
```

Colour map:
- PENDING → amber
- CONFIRMED → blue
- IN_PROGRESS → purple
- COMPLETED → emerald
- CANCELLED → red

### `BookingCard`

```tsx
interface BookingCardProps {
  booking: BookingRow;
  mode: 'customer' | 'provider';
  onStatusChange?: (id: string, status: string) => void;
  onReview?: (bookingId: string) => void;
}
```

### `SkeletonCard`

Shimmer placeholder matching `ProviderCard` dimensions. Used while `isLoading` on provider queries.

### `StarRating`

```tsx
interface StarRatingProps {
  value: number;       // 0–5
  max?: number;        // default 5
  size?: number;       // icon size in px, default 16
  interactive?: boolean; // clickable for review forms
  onChange?: (v: number) => void;
}
```

---

## Bug Fixes Addressed in Design

### Bug 1 — Missing `useRouter` in `__root.tsx` (Req 30)

Add `useRouter` to the import from `@tanstack/react-router` in `__root.tsx`:
```tsx
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link, useRouter } from "@tanstack/react-router";
```

### Bug 2 — Admin Providers Tab Only Shows Unverified (Req 28)

Add new endpoint `GET /api/v1/admin/providers` that queries ALL providers regardless of
`is_verified`. Frontend fetches from this dedicated endpoint with filters for
`is_verified`, `city`, `status`, and `q` (name search).

### Bug 3 — Provider Profile "Book Now" Only Links First Category (Req 29)

When `provider_categories.length > 1`, render a dropdown/card-list selector. Each option
navigates to `/book/${category.id}` with the providerId passed as a query param.
The booking flow reads the optional `?providerId` search param and pre-selects that provider.

### Bug 4 — Coupon Validation Client-Side Only (Req 10)

Server recalculates `total_amount` on booking creation using `couponValidator.validate()`.
If client-submitted total doesn't match, server total is used silently. Client-side
"FIRST10" hardcode is removed; all validation goes through `/coupons/validate`.

### Bug 5 — No Double-Booking Check (Req 7)

Booking creation adds a DB check for overlapping slots before INSERT. New
`GET /api/v1/providers/:id/availability?date=YYYY-MM-DD` endpoint returns booked slots.
`TimeSlotGrid` fetches this and disables occupied slots.

### Bug 6 — `limit` SQL Injection Risk (Req 3)

`LIMIT ${Number(limit)}` is replaced with validated integer: `parseInt(limit, 10)` and
clamped to `[1, 100]`, defaulting to 20 if invalid.

### Bug 7 — No Auth on Sensitive Endpoints (Req 1)

`authMiddleware` added to all non-public routes. `requireRole('ADMIN')` added to all admin
routes. `requireRole('CUSTOMER')` added to booking creation.

---

## Real-Time Design (Req 20, 21, 22)

### WebSocket Architecture

Using `ws` package alongside Express:

```
wsServer listens on ws://localhost:4001/ws
Each connection identified by JWT token (passed as ?token= query param)
Rooms keyed by booking_id for GPS tracking and chat
```

### GPS Tracking Flow

```
Provider connects → sends { type: 'location', bookingId, lat, lng } every 10s
Server stores latest coords in memory (Map<bookingId, {lat, lng, updatedAt}>)
Server broadcasts to Customer's ws connection: { type: 'provider_location', lat, lng, eta }
On booking COMPLETED/CANCELLED → close tracking session, remove from memory map
```

### Chat Flow

```
Client connects with JWT token
To send: { type: 'chat', bookingId, content }
Server validates: sender is Customer or Provider on that booking
Server persists to chat_messages table
Server broadcasts to other party's ws connection
Offline delivery: messages stored in DB, replayed on reconnect (GET /api/v1/bookings/:id/messages)
```

---

## Performance Design (Req 32)

- **Categories cache**: `Map<'categories', { data, expiresAt }>` in-memory, 60s TTL
- **Connection pool**: `mysql2.createPool({ connectionLimit: 50, queueLimit: 0 })`
- **Pagination**: All list endpoints accept `?page=1&limit=20`, default limit 20, max 100
- **Indexes**: 
  - `bookings (provider_id, scheduled_date, scheduled_time, status)` — for double-booking check
  - `bookings (customer_id)` — for customer booking list
  - `providers (status, is_verified)` — for dispatcher query
  - `chat_messages (booking_id)` — for message retrieval

---

## Error Response Format (Req 33)

All 4xx/5xx responses return:

```json
{
  "error": "MACHINE_READABLE_CODE",
  "message": "Human readable description of what went wrong."
}
```

Stack traces never included in responses. Internal errors logged to console with full context.

---

## Data Integrity Design (Req 34)

Multi-table writes wrapped in explicit transactions:

```js
const conn = await pool.getConnection();
await conn.beginTransaction();
try {
  // step 1
  // step 2
  await conn.commit();
} catch (e) {
  await conn.rollback();
  throw e;
} finally {
  conn.release();
}
```

Wallet updates use `SELECT ... FOR UPDATE` on the `provider_wallet` row to prevent
concurrent race conditions.

---

## Requirements Coverage Matrix

| Req | Feature | Files Changed |
|-----|---------|---------------|
| 1 | Auth middleware | `server/middleware/auth.js` (new) |
| 2 | Rate limiting | `server/middleware/rateLimiter.js` (new) |
| 3 | Input sanitization | `server/middleware/sanitize.js` (new) |
| 4 | CSRF (JWT only) | `auth.js` middleware covers POST/PATCH/DELETE |
| 5 | Phone OTP login | `server/api.js` + `auth.login.tsx` |
| 6 | Auto-dispatch | `server/dispatcher.js` (new) |
| 7 | Double-booking check | `server/api.js` booking POST + availability endpoint |
| 8 | City filtering | `server/api.js` providers GET + `index.tsx` |
| 9 | Payment-before-confirm | `server/api.js` booking POST + Razorpay integration |
| 10 | Server coupon validation | `server/couponValidator.js` (new) |
| 11 | Wallet ledger | `server/walletLedger.js` (new) |
| 12 | Provider online/offline toggle | `provider/index.tsx` + `server/api.js` |
| 13 | Pin-code service area | `provider/onboarding.tsx` + dispatcher |
| 14 | Provider onboarding wizard | `provider/onboarding.tsx` (new) |
| 15 | Earnings + payouts | `provider/earnings.tsx` (new) + `server/api.js` |
| 16 | Address book | `profile.tsx` (new) + `server/api.js` addresses endpoints |
| 17 | Customer profile | `profile.tsx` (new) + `server/api.js` profile endpoint |
| 18 | Subscriptions | `server/api.js` + schema + `index.tsx` |
| 19 | Post-service review flow | `bookings.tsx` + review modal |
| 20 | GPS tracking | WebSocket + `book.$categoryId.tsx` tracking view |
| 21 | Push/SMS notifications | `server/notificationService.js` (new, stub) |
| 22 | In-app chat | WebSocket + chat UI component (new) |
| 23 | Search | `search.tsx` (new) + `server/search.js` (new) |
| 24 | Packages & add-ons | `book.$categoryId.tsx` + schema + API |
| 25 | Admin coupon CRUD UI | `admin/coupons.tsx` (new) |
| 26 | Admin document review | `admin/kyc.tsx` (new) |
| 27 | Admin payout management | `admin/payouts.tsx` (new) |
| 28 | Admin all-providers view | `admin/providers.tsx` (new) + `/admin/providers` endpoint |
| 29 | Provider multi-category booking | `providers.$providerId.tsx` fix |
| 30 | `useRouter` import fix | `__root.tsx` fix |
| 31 | Phone join in queries | `server/api.js` JOIN fix |
| 32 | Performance / pagination | API + DB indexes |
| 33 | Error handling / observability | Error middleware + structured responses |
| 34 | Data integrity / transactions | Wrapped multi-table writes |

---

## Correctness Properties

These properties are verified by property-based tests in the test suite.

- **Property 1.A:** For any string that is not a validly signed JWT issued by the System, the Auth_Middleware returns 401. Tested with random strings, tampered payloads, and wrong-secret tokens.

- **Property 1.B:** For any valid JWT with role R on a route requiring role R', access is granted if and only if R == R' or R == ADMIN.

#### Property 3.A — Sanitizer Idempotence
For any input string S, `sanitize(sanitize(S)) === sanitize(S)`.

#### Property 3.B — SQL Safety
All user-supplied values are parameterized; no SQL injection payload can modify the query structure.

#### Property 6.A — Dispatcher Assignment Validity
For any auto-dispatched booking, the assigned provider is ONLINE, is_verified=true, serves the category, and has the booking pin code in their pin_codes array.

#### Property 6.B — No Double Assignment
No provider is assigned two confirmed bookings at the same scheduled_date and scheduled_time.

#### Property 7.A — No Overlap Invariant
The database never contains two bookings for the same provider at the same date and time slot with status PENDING, CONFIRMED, or IN_PROGRESS.

#### Property 8.A — City Filter Completeness
Every provider returned by `/providers?city=C` has `profile.city === C`.

#### Property 9.A — Confirmation Requires Payment
Every booking with status CONFIRMED has a payment record with status PAID.

#### Property 10.A — Discount Calculation Correctness
For PERCENT coupons, `discount === Math.floor(amount * value / 100)`. For FLAT coupons, `discount === Math.min(value, amount)`.

#### Property 10.B — Exhausted Coupon Rejection
When `used_count >= max_uses`, the system always returns COUPON_EXHAUSTED regardless of other fields.

#### Property 11.A — Wallet Total Earned Invariant
For any provider P, `total_earned === sum(provider_amount for all COMPLETED bookings assigned to P)` at all times.

#### Property 11.B — Balance Non-Negative
For any provider P, `available_balance >= 0` and `pending_balance >= 0` at all times.

#### Property 13.A — Distance Symmetry
`distance(A, B) === distance(B, A)` for any two coordinates A and B.

#### Property 13.C — Self-Distance
`distance(A, A) === 0` for any coordinate A.

#### Property 15.A — Payout Balance Invariant
After a REQUESTED payout of amount A, `available_balance_after === available_balance_before - A`.

#### Property 15.B — Insufficient Balance Rejection
Any payout where `amount > available_balance` always returns INSUFFICIENT_BALANCE.

#### Property 16.A — Single Default Address Invariant
At most one address per customer has `is_default === true` at any point in time.

#### Property 18.A — Session Decrement Invariant
After N confirmed bookings using subscription S, `S.sessions_remaining === S.initial_sessions_per_month - N`.

#### Property 18.B — Exhausted Subscription No Discount
When `sessions_remaining === 0`, no subscription discount is applied to any booking.

#### Property 19.A — Rating Range Enforcement
Any review with `rating < 1` or `rating > 5` or non-integer rating always returns HTTP 422.

#### Property 19.B — Average Rating Correctness
For any provider P with N non-flagged reviews, `avg_rating === sum(ratings) / N` rounded to 2 decimal places.

#### Property 19.C — One Review Per Booking
The reviews table contains at most one row per booking_id.

#### Property 22.A — Message Ordering Invariant
Messages for any booking are always returned in ascending `created_at` order.

#### Property 23.A — City Filter in Search
All provider results from a search with `city=C` have `profile.city === C`.

#### Property 24.A — Price Calculation Correctness
For any booking with package P and add-ons, `total === P.price + sum(addon.additional_price)`.

#### Property 34.A — Transaction Atomicity
A simulated failure at any step of a multi-table write leaves the database fully rolled back with no partial writes.

---

## Error Handling

All API errors return structured JSON:

```json
{ "error": "MACHINE_READABLE_CODE", "message": "Human readable description." }
```

Error codes used across the system:

| Code | HTTP | Trigger |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No token on protected route |
| `TOKEN_INVALID` | 401 | Expired or malformed JWT |
| `FORBIDDEN` | 403 | Wrong role for route |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., duplicate review) |
| `SLOT_UNAVAILABLE` | 409 | Provider already booked at that time |
| `VALIDATION_ERROR` | 422 | Input validation failure |
| `COUPON_NOT_FOUND` | 422 | Coupon code not in DB |
| `COUPON_EXPIRED` | 422 | Coupon past expires_at |
| `COUPON_EXHAUSTED` | 422 | used_count >= max_uses |
| `COUPON_INACTIVE` | 422 | is_active = false |
| `PROVIDER_CITY_MISMATCH` | 422 | Provider city ≠ booking city |
| `INVALID_PIN_CODE` | 422 | Not a 6-digit Indian postal code |
| `INSUFFICIENT_BALANCE` | 422 | Payout amount > available_balance |
| `OTP_INVALID` | 401 | Incorrect OTP submitted |
| `OTP_EXPIRED` | 401 | OTP past 10-minute expiry |
| `OTP_MAX_ATTEMPTS` | 429 | 5 consecutive wrong OTPs |
| `PAYMENT_VERIFICATION_FAILED` | 402 | Razorpay signature mismatch |
| `NO_PROVIDER_AVAILABLE` | 503 | No eligible provider found by dispatcher |
| `QUERY_TOO_SHORT` | 400 | Search query < 2 characters |
| `INTERNAL_ERROR` | 500 | Unhandled server error (no stack trace in response) |

Client-facing error responses never include stack traces. All 500 errors are logged server-side
with full context: `timestamp, method, path, error.message, error.stack`.

---

## Testing Strategy

### Unit Tests (`server/__tests__/`)

- `couponValidator.test.js` — property-based tests for discount calculation (fast-check)
- `walletLedger.test.js` — balance invariant tests with mocked DB
- `dispatcher.test.js` — assignment validity + no-double-assignment tests
- `sanitize.test.js` — idempotence + XSS payload stripping
- `reviewAggregator.test.js` — avg_rating correctness with random rating arrays

### Integration Tests (`server/__tests__/integration/`)

- `auth.test.js` — JWT middleware: valid, expired, wrong-secret, missing token
- `bookings.test.js` — double-booking prevention, city mismatch, coupon validation
- `wallet.test.js` — balance changes through booking lifecycle

### Frontend Tests (`src/__tests__/`)

- `TimeSlotGrid.test.tsx` — disabled slots not selectable, selected slot highlighted
- `StarRating.test.tsx` — interactive rating changes, display accuracy
- `StatusBadge.test.tsx` — correct colour per status value

### End-to-End (Playwright, `e2e/`)

- Customer: sign up → browse services → book → confirm → view in bookings
- Provider: sign up → onboarding wizard → go online → accept job → complete
- Admin: login → approve KYC → create coupon → approve payout
