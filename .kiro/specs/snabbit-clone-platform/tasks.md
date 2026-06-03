# Tasks

## Task 1: Fix `useRouter` Import in Root Layout
**Status:** not_started
**Priority:** high
**Dependencies:** none

The `useRouter` hook is already imported in `__root.tsx` but the import was flagged as missing in requirements. Verify the import is present and correct, confirm the `ErrorComponent` compiles without TypeScript errors, and ensure the error boundary displays the error message and a "Reload" button correctly.

### Subtasks
- [-] Open `src/routes/__root.tsx` and confirm `useRouter` is included in the `@tanstack/react-router` import statement
- [~] Verify TypeScript compiles without errors (`npm run build` or `tsc --noEmit`)
- [~] Confirm the `ErrorComponent` renders a "Try again" / "Reload" button that calls `router.invalidate()` and `reset()`
- [~] Add ESLint ignore or fix if any lint rule flags the import

---

## Task 2: Fix `limit` SQL Injection Risk and Add Input Validation
**Status:** not_started
**Priority:** high
**Dependencies:** none

In `server/api.js`, the `GET /providers` route constructs `LIMIT ${Number(limit)}` via string interpolation. Replace with a validated, clamped integer. Also add `address` and `notes` length validation (max 1000 chars) on booking creation. Covers Req 3.

### Subtasks
- [~] In `server/api.js` on the `GET /providers` route, replace `` LIMIT ${Number(limit)} `` with a safe helper: `const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))`
- [~] Pass `safeLimit` as a parameterized value: change to `LIMIT ?` and append `safeLimit` to the params array
- [~] Add validation in `POST /bookings` to reject `address` or `notes` exceeding 1000 characters with HTTP 400
- [~] Add validation on all list endpoints (`/admin/users`, `/admin/providers`) to clamp `limit` and `page` parameters

---

## Task 3: Fix Admin Providers Tab to Show All Providers
**Status:** not_started
**Priority:** high
**Dependencies:** Task 2

The admin overview endpoint only returns unverified providers in the `pending` array. Add a dedicated `GET /api/v1/admin/providers` endpoint that returns all providers with filters. Covers Req 28.

### Subtasks
- [~] Add `GET /api/v1/admin/providers` endpoint in `server/api.js` — query all providers with optional `is_verified`, `city`, `status`, `q` (name search), `page`, `limit` filters
- [~] LEFT JOIN `profile_contacts` to include phone in the response
- [~] Return fields: `id`, `name`, `city`, `phone`, `is_verified`, `avg_rating`, `review_count`, `hourly_rate`, `status`, `onboarding_status`, `created_at`
- [~] Update `src/routes/admin.index.tsx` Providers tab to fetch from `/admin/providers` instead of using `pending` from the overview
- [~] Add filter controls (verified toggle, city input, status dropdown, name search) to the Providers tab UI

---

## Task 4: Fix Provider Profile Multi-Category "Book Now"
**Status:** not_started
**Priority:** high
**Dependencies:** none

When a provider offers multiple service categories, the "Book Now" button must let the customer choose a category before navigating to the booking flow. Covers Req 29.

### Subtasks
- [~] In `src/routes/providers.$providerId.tsx`, read all `provider_categories` from the API response
- [~] When `provider_categories.length > 1`, render a service selector (radio card list or select dropdown) showing each category name and custom price
- [~] When `provider_categories.length === 1`, keep the current single "Book Now" button behaviour
- [~] Update the "Book Now" navigation to use the selected `category.id` as the route param: `navigate({ to: '/book/$categoryId', params: { categoryId: selectedCategoryId }, search: { providerId: provider.id } })`
- [~] In `src/routes/book.$categoryId.tsx`, read the optional `?providerId` search param and pre-select that provider in Step 1

---

## Task 5: Fix Phone JOIN in Provider and User Queries
**Status:** not_started
**Priority:** high
**Dependencies:** none

Provider list and admin user queries do not join `profile_contacts`, so phone numbers are missing. Covers Req 31.

### Subtasks
- [~] In `GET /api/v1/providers` (both branches), add `LEFT JOIN profile_contacts pc2 ON pc2.user_id = p.id` and include `pc2.phone` in the SELECT and response mapping
- [~] In `GET /api/v1/provider/:id`, add the same JOIN and include `phone` in the response (masked to last 4 digits for customer-facing view)
- [~] In `GET /api/v1/admin/users`, update the per-user profile query to pull phone from `profile_contacts` instead of `profiles.phone`
- [~] Add phone masking helper `maskPhone(phone)` → `******XXXX` for customer-facing endpoints

---

## Task 6: Add JWT Auth Middleware to All Protected Routes
**Status:** not_started
**Priority:** high
**Dependencies:** none

No JWT verification exists on any route. Create `server/middleware/auth.js` and apply it to all non-public routes. Also add `JWT_SECRET` startup check. Covers Req 1, 4.

### Subtasks
- [~] Create `server/middleware/auth.js` with `authMiddleware(req, res, next)` — extract Bearer token, call `jwt.verify`, populate `req.user = { id, email, role }`, return 401 on missing/invalid/expired tokens
- [~] Create `requireRole(...roles)` helper in the same file that returns 403 `FORBIDDEN` when `req.user.role` is not in the allowed list
- [~] Add startup check in `server/api.js`: if `process.env.NODE_ENV === 'production'` and `JWT_SECRET` is absent or equals `'dev-secret'`, log fatal and `process.exit(1)`
- [~] Import and apply `authMiddleware` to all protected routes in `server/api.js`: `/bookings`, `/profile`, `/addresses`, `/provider-wallet/:id`, `/payouts`, `/coupons/validate`, `/reviews` POST, provider status PATCH
- [~] Apply `requireRole('ADMIN')` to all `/admin/*` routes
- [~] Apply `requireRole('CUSTOMER')` to `POST /bookings` and address CRUD
- [~] Apply `requireRole('PROVIDER')` to provider status toggle and payout request

---

## Task 7: Add Rate Limiting on Auth Endpoints
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6

Add `express-rate-limit` middleware for login (10 req / 15 min per IP) and OTP send (5 req / 10 min per phone). Covers Req 2.

### Subtasks
- [~] Install `express-rate-limit` if not already present (check `package.json` — it's not listed, add it)
- [~] Create `server/middleware/rateLimiter.js` exporting `loginLimiter` and `otpLimiter`
- [~] `loginLimiter`: `windowMs: 15*60*1000, max: 10, keyGenerator: req => req.ip`, returns 429 with `Retry-After` header
- [~] `otpLimiter`: `windowMs: 10*60*1000, max: 5, keyGenerator: req => req.body?.phone || req.ip`, returns 429 and error code `OTP_RATE_LIMITED`
- [~] Apply `loginLimiter` to `POST /auth/login` in `server/api.js`
- [~] Apply `otpLimiter` to `POST /auth/otp/send` in `server/api.js`

---

## Task 8: Add Input Sanitization Middleware
**Status:** not_started
**Priority:** high
**Dependencies:** none

Strip HTML tags from all string body fields before they reach route handlers. Covers Req 3.

### Subtasks
- [~] Create `server/middleware/sanitize.js` exporting `sanitizeBody(req, res, next)` — recursively walk `req.body`, call `stripHtml(value)` on every string value
- [~] Implement `stripHtml(s)`: remove `<...>` tags and `on*=` attributes using a simple regex (no external lib needed)
- [~] Verify idempotence: `stripHtml(stripHtml(s)) === stripHtml(s)` with a unit test or inline assertion
- [~] Apply `sanitizeBody` in `server/api.js` after `express.json()` and before routes

---


## Task 9: Add CSRF Protection via JWT Enforcement
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6

Enforce `Content-Type: application/json` on all state-changing endpoints and confirm all POST/PATCH/DELETE routes require the Authorization header via the auth middleware. Covers Req 4.

### Subtasks
- [~] Add a middleware in `server/api.js` that returns HTTP 415 when `Content-Type` is not `application/json` on POST/PUT/PATCH/DELETE requests
- [~] Verify that all state-changing routes pass through `authMiddleware` (after Task 6)
- [~] Add note in `server/api.js` comments about SameSite=Strict cookies (applicable if cookie-based sessions are ever added)
- [~] Test: send a PATCH /bookings/:id with `Content-Type: application/x-www-form-urlencoded` and confirm 415 response

---

## Task 10: Add All New DB Tables via Migration
**Status:** not_started
**Priority:** high
**Dependencies:** none

Create a migration file for all new tables defined in the design and the `ALTER TABLE` statements for existing tables. Covers the schema foundation for Tasks 11–47.

### Subtasks
- [~] Create `server/migrations/001_new_tables.sql` with `CREATE TABLE IF NOT EXISTS` statements for: `otp_requests`, `addresses`, `subscription_plans`, `subscriptions`, `service_packages`, `service_addons`, `provider_status_log`, `payouts`, `chat_messages`, `notifications`
- [~] Add `ALTER TABLE bookings ADD COLUMN package_id VARCHAR(50) NULL, ADD COLUMN addon_ids JSON NULL, ADD COLUMN pin_code VARCHAR(10) NULL AFTER address` (guarded with `IF NOT EXISTS` check via separate migration)
- [~] Add `ALTER TABLE providers ADD COLUMN onboarding_status ENUM('INCOMPLETE','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'INCOMPLETE' AFTER status`
- [~] Add `ALTER TABLE profiles ADD COLUMN phone VARCHAR(20) NULL AFTER city`
- [~] Add all DB indexes: `bookings(provider_id, scheduled_date, scheduled_time, status)`, `bookings(customer_id)`, `providers(status, is_verified)`, `chat_messages(booking_id)`
- [~] Update `server/migrate.js` to run the new migration file in order
- [~] Test migration runs cleanly on a fresh database and on the existing database (idempotent)

---

## Task 11: Phone OTP Login — Backend Endpoints
**Status:** not_started
**Priority:** high
**Dependencies:** Task 8, Task 10

Implement `POST /auth/otp/send` and `POST /auth/otp/verify` endpoints with OTP hashing, expiry, attempt counting, and JWT issuance. Covers Req 5.

### Subtasks
- [~] In `server/api.js`, add `POST /auth/otp/send`: validate 10-digit Indian mobile, generate 6-digit OTP, hash with bcrypt, insert into `otp_requests` with 10-min expiry, call `notificationService.sendSms(phone, otp)` stub
- [~] Add `POST /auth/otp/verify`: look up unexpired, unused record for phone, bcrypt-compare OTP, return 401 `OTP_INVALID` on mismatch (increment `attempt_count`), 401 `OTP_EXPIRED` if expired, 429 `OTP_MAX_ATTEMPTS` if `attempt_count >= 5`
- [~] On successful verify: mark OTP as `used = 1`, find or create user record linked to phone, issue JWT with `user_id`, `email`, `role`, return `{ token, user }`
- [~] Create `server/notificationService.js` stub with `sendSms(phone, message)` (console.log in development)
- [~] Apply `otpLimiter` from Task 7 to `POST /auth/otp/send`

---

## Task 12: Phone OTP Login — Frontend UI
**Status:** not_started
**Priority:** high
**Dependencies:** Task 11

Add a "Login with Phone" tab to the existing auth login page. Covers Req 5 (frontend part).

### Subtasks
- [~] In `src/routes/auth.login.tsx`, add a Tabs component with "Email / Password" and "Phone OTP" tabs
- [~] Phone OTP tab — Step 1: phone number input + "Send OTP" button; call `POST /auth/otp/send`, show success toast, move to Step 2
- [~] Phone OTP tab — Step 2: 6-digit OTP input (use existing `ui/input-otp.tsx`), "Verify" button; call `POST /auth/otp/verify`, store token in localStorage, redirect to appropriate dashboard
- [~] Show countdown timer (10:00 → 0:00) and "Resend OTP" link after 60 seconds
- [~] Handle errors: `OTP_INVALID`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS` — display user-friendly messages via sonner toast

---

## Task 13: Double-Booking Prevention and Availability Endpoint
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10

Add server-side overlap check on booking creation and a public availability endpoint. The `TimeSlotGrid` component should disable booked slots. Covers Req 7.

### Subtasks
- [~] Add `GET /api/v1/providers/:id/availability?date=YYYY-MM-DD` in `server/api.js` — return array of booked `scheduled_time` values for that provider/date with status IN (`PENDING`, `CONFIRMED`, `IN_PROGRESS`)
- [~] In `POST /bookings` handler, before INSERT, run the overlap check query; if a conflict exists, return 409 `SLOT_UNAVAILABLE`
- [~] In `src/components/booking/TimeSlotGrid.tsx`, add a `useQuery` to fetch `/providers/:id/availability?date=...` when a provider and date are selected
- [~] Pass fetched booked slots to `TimeSlotGrid` as `bookedSlots` prop; confirm the component already disables slots with `opacity-40 cursor-not-allowed` (verify and fix if needed)
- [~] Add the DB index `bookings(provider_id, scheduled_date, scheduled_time, status)` via migration (Task 10)

---

## Task 14: City-Based Provider Filtering
**Status:** not_started
**Priority:** high
**Dependencies:** Task 10

Ensure providers are filtered by city in both API and frontend. Add a city context/localStorage persistence and apply it to all provider queries. Covers Req 8.

### Subtasks
- [~] In `GET /api/v1/providers`, add optional `?city=` query param and add `AND pr.city = ?` to the WHERE clause when provided
- [~] Create `src/lib/city-context.tsx` exporting `CityProvider` and `useCity()` hook; persist city in `localStorage('homehero_city')`
- [~] Wrap the app in `CityProvider` in `src/routes/__root.tsx`
- [~] In `src/routes/index.tsx` hero section, add a city selector dropdown (hardcoded list of 22 Indian cities); on change, update `useCity()` and refetch provider queries
- [~] In `src/routes/book.$categoryId.tsx`, pass `city` from `useCity()` to the providers query
- [~] On booking creation, validate server-side that `provider.city === booking.city`; return 422 `PROVIDER_CITY_MISMATCH` if not

---


## Task 15: Coupon Validator Service and `/coupons/validate` Endpoint
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 8

Create the server-side coupon validator module and expose the validation endpoint. Remove the hardcoded "FIRST10" client-side logic. Covers Req 10.

### Subtasks
- [~] Create `server/couponValidator.js` exporting `async validate(code, amount)` — implement all checks: exists, is_active, not expired, not exhausted; return `{ discount, total, coupon_id }` or throw typed errors
- [~] Add `POST /api/v1/coupons/validate` in `server/api.js` (auth required, CUSTOMER role); call `couponValidator.validate()` and return result or 422 with specific error codes
- [~] In `POST /bookings` handler, if `coupon_code` is present, call `couponValidator.validate()` server-side and use the returned `total` regardless of client-submitted total
- [~] After booking payment confirmed, increment `coupons.used_count` in the same transaction
- [~] In `src/routes/book.$categoryId.tsx` Step 3, remove any hardcoded "FIRST10" discount and replace with a call to `POST /coupons/validate`; display the returned discount amount

---

## Task 16: Auto-Dispatch Engine
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10, Task 13, Task 14

Create the dispatcher module that auto-assigns the best available provider to a booking. Covers Req 6.

### Subtasks
- [~] Create `server/dispatcher.js` exporting `async dispatch(bookingData)` — query eligible providers (ONLINE, verified, matching category, pin_code in `p.pin_codes` JSON, no overlap), rank by `avg_rating DESC, active_count ASC`, return top provider's id or throw `NO_PROVIDER_AVAILABLE`
- [~] In `POST /bookings`, call `dispatcher.dispatch()` if `provider_id` is not explicitly provided (auto-dispatch mode); if no provider found within 5 seconds, return 503 `NO_PROVIDER_AVAILABLE`
- [~] After auto-assignment, set provider status to `BUSY` if they now have an `IN_PROGRESS` booking
- [~] Implement 60-second re-dispatch: use `setTimeout` in the booking creation handler; if provider hasn't accepted within 60s, re-dispatch and notify customer
- [~] Call `notificationService.sendPush(providerId, 'New booking assigned')` after successful auto-dispatch

---

## Task 17: Payment-Before-Confirmation Flow with Razorpay Stub
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10, Task 16

Implement a Razorpay order creation stub, payment verification endpoint, and webhook. Booking is created as `PAYMENT_PENDING` and only confirmed after verified payment. Covers Req 9.

### Subtasks
- [~] Create `server/paymentGateway.js` with `createOrder(amount)` stub returning `{ id: 'rzp_order_stub_...', amount }` and `verifySignature(orderId, paymentId, signature)` stub returning `true`
- [~] Add `POST /api/v1/payments/create-order` — create booking with status `PAYMENT_PENDING`, create Razorpay order, return `{ booking_id, razorpay_order_id, amount }`
- [~] Add `POST /api/v1/payments/verify` — verify Razorpay signature; on success, wrap in transaction: update booking to `CONFIRMED`, payment to `PAID`, update wallet pending balance; on failure return 402 `PAYMENT_VERIFICATION_FAILED`
- [~] Add `POST /api/v1/payments/webhook` — handle `payment.captured` event to confirm booking if not already confirmed
- [~] In `src/routes/book.$categoryId.tsx` Step 3 "Pay" button, call `/payments/create-order` then simulate Razorpay checkout (stub), then call `/payments/verify`
- [~] On confirmed booking, trigger `notificationService` for customer and provider confirmation SMS/push

---

## Task 18: Wallet Ledger — Update on Booking Status Change
**Status:** not_started
**Priority:** high
**Dependencies:** Task 10, Task 17

Create the wallet ledger module and integrate it with booking status transitions. Covers Req 11.

### Subtasks
- [~] Create `server/walletLedger.js` exporting `async onBookingConfirmed(conn, bookingId)`, `async onBookingCompleted(conn, bookingId)`, `async onBookingCancelled(conn, bookingId)` — each uses `SELECT ... FOR UPDATE` on `provider_wallet` and updates balances inside the passed DB connection (transaction-safe)
- [~] In `POST /payments/verify`, inside the confirmation transaction, call `walletLedger.onBookingConfirmed()` to add to `pending_balance`
- [~] In `PATCH /bookings/:id`, when status transitions to `COMPLETED`, wrap in a transaction and call `walletLedger.onBookingCompleted()` + insert `transactions` record
- [~] In `PATCH /bookings/:id`, when status transitions to `CANCELLED` (after CONFIRMED), call `walletLedger.onBookingCancelled()` and initiate refund stub
- [~] Ensure `provider_wallet` row is created (upsert) when provider is created during signup

---

## Task 19: Provider Online/Offline Status Toggle and API
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10

Add the status toggle API endpoint and integrate it with the provider dashboard UI. Covers Req 12.

### Subtasks
- [~] Add `PATCH /api/v1/provider/status` in `server/api.js` (auth required, PROVIDER role): accept `{ status: 'ONLINE' | 'OFFLINE' }`, block if `onboarding_status !== 'APPROVED'`, block ONLINE if provider has active `IN_PROGRESS` booking, update `providers.status`, insert into `provider_status_log`
- [~] In `src/routes/provider.index.tsx`, add a prominent pill-shaped Online/Offline toggle switch; call the status API on toggle; optimistically update UI
- [~] Show a "Complete onboarding first" message if `onboarding_status !== 'APPROVED'`
- [~] Show a "You have an active booking" message if status is `BUSY` and block toggle to ONLINE
- [~] Display current status badge (ONLINE = green, OFFLINE = grey, BUSY = amber) prominently on the provider dashboard header

---

## Task 20: Provider Onboarding Wizard — Frontend and Backend
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10, Task 19

Create the 5-step provider onboarding wizard route and the backend endpoints to save progress at each step. Covers Req 13, 14.

### Subtasks
- [~] Create `src/routes/provider.onboarding.tsx` with a 5-step wizard (progress bar at top): Step 1 Personal Details, Step 2 Service Categories, Step 3 Service Area Pin Codes, Step 4 Document Upload, Step 5 Review & Submit
- [~] Persist wizard progress to `localStorage('provider_onboarding_progress')` on each step; restore on page load
- [~] Step 1: form for name, phone, city, bio, experience_years, hourly_rate; call `PUT /providers/:id/profile`
- [~] Step 2: multi-select category cards with custom price input per category; call `POST /providers/:id/categories` for each selected
- [~] Step 3: pin code tag-input (add/remove, max 20, validate 6-digit numeric); call new `PATCH /providers/:id/pin-codes` endpoint in `server/api.js`
- [~] Step 4: file URL inputs for AADHAAR, PAN, BANK; call `POST /providers/:id/documents` for each
- [~] Step 5: read-only summary of all entered data; "Submit for Review" button calls new `POST /providers/:id/submit-onboarding` endpoint that sets `onboarding_status = 'SUBMITTED'` and notifies admin
- [~] Add `GET /api/v1/providers/:id/onboarding-status` endpoint for the dashboard banner check
- [~] In `src/routes/provider.index.tsx`, show a yellow banner if `onboarding_status !== 'APPROVED'` with a link to `/provider/onboarding`

---


## Task 21: Provider Earnings Dashboard and Payout Requests
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10, Task 18

Create the provider earnings page with wallet summary, transaction history, payout request form, and the backend payout endpoints. Covers Req 15.

### Subtasks
- [~] Create `src/routes/provider.earnings.tsx` with: wallet summary cards (Available / Pending / Total Earned), payout request form, transaction history table, Recharts LineChart for earnings over time
- [~] Add `POST /api/v1/payouts` in `server/api.js` (PROVIDER role): validate `amount > 0` and `amount <= available_balance`, create payout record with status `REQUESTED`, deduct from `available_balance`, notify admin
- [~] Add `GET /api/v1/provider/payouts` (PROVIDER role): return provider's own payout history
- [~] Add `GET /api/v1/transactions?user_id=...` (PROVIDER role): return transaction history from `transactions` table
- [~] In the payout form, pre-populate bank details from `provider_payouts` table; allow editing before submit
- [~] Show 422 `INSUFFICIENT_BALANCE` error inline when requested amount exceeds available balance

---

## Task 22: Address Book — CRUD API and Frontend
**Status:** not_started
**Priority:** high
**Dependencies:** Task 6, Task 10

Implement the full address book feature: backend CRUD endpoints and a frontend address management UI in the customer profile page. Covers Req 16.

### Subtasks
- [~] Add `GET /api/v1/addresses` (CUSTOMER role): return all addresses for `req.user.id`
- [~] Add `POST /api/v1/addresses` (CUSTOMER role): create address; enforce single-default invariant (set others to `is_default = 0` in a transaction when `is_default = true`)
- [~] Add `PATCH /api/v1/addresses/:id` (CUSTOMER self): update address fields; re-enforce single-default invariant if `is_default` changed to true
- [~] Add `DELETE /api/v1/addresses/:id` (CUSTOMER self): delete address; if it was default, set the most recent remaining address as default
- [~] Create address CRUD UI inside `src/routes/profile.tsx` (Task 23 will add the profile page): show saved addresses as cards with Edit/Delete/Set Default buttons and an "Add Address" dialog form
- [~] In `src/routes/book.$categoryId.tsx` Step 2, display saved addresses as selectable radio cards; auto-fill address and pin_code when one is selected
- [~] Validate pin_code as 6-digit numeric before submission

---

## Task 23: Customer Profile Management Page
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 22

Create the `/profile` route for customers to view and edit their profile data. Covers Req 17.

### Subtasks
- [~] Create `src/routes/profile.tsx` with avatar display, name/email/phone/city form, and booking summary (total bookings count, total spent)
- [~] Add `GET /api/v1/profile` (auth required): return `{ id, name, email, phone, city, avatar_url }` joined across `users`, `profiles`, `profile_contacts`
- [~] Add `PATCH /api/v1/profile` (auth required): validate name (2–100 chars), phone (10-digit Indian), city (non-empty, ≤100 chars); update `profiles` and `profile_contacts` tables
- [~] Add avatar upload: `POST /api/v1/profile/avatar` — accept base64 or file URL (≤5 MB, JPEG/PNG), update `profiles.avatar_url`
- [~] Display booking stats: query `COUNT(*)` and `SUM(total_amount)` from `bookings WHERE customer_id = req.user.id AND status = 'COMPLETED'`
- [~] Show field-level validation errors using react-hook-form + zod schema

---

## Task 24: Subscription / Membership Plans — API and Frontend
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 10, Task 17

Implement subscription plans: admin can create them, customers can purchase and use them, booking flow auto-applies discount. Covers Req 18.

### Subtasks
- [~] Add `GET /api/v1/subscription-plans` (public): return all active plans from `subscription_plans`
- [~] Add `POST /api/v1/subscriptions` (CUSTOMER role): purchase a plan — create subscription record with `sessions_remaining = plan.sessions_per_month`, `renewal_date = today + 30 days`
- [~] Add `GET /api/v1/subscriptions/active` (CUSTOMER role): return customer's active subscription if any
- [~] In `POST /bookings`, check for active subscription with `sessions_remaining > 0`; apply `discount_percent` to `total_amount`; decrement `sessions_remaining` in the booking confirmation transaction
- [~] When `sessions_remaining` reaches 0, set subscription `status = 'EXHAUSTED'`
- [~] Add a "Membership Plans" section to `src/routes/index.tsx` (homepage) showing available plans as cards with a "Subscribe" button
- [~] Add subscription status display to `src/routes/profile.tsx` (current plan, sessions remaining, renewal date, cancel button)

---

## Task 25: Post-Service Review Flow
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 10

Add review submission after booking completion, with aggregated rating updates. Covers Req 19.

### Subtasks
- [~] Create `server/reviewAggregator.js` exporting `async recalculate(provider_id)` — query non-flagged ratings, compute mean, update `providers.avg_rating` and `providers.review_count`
- [~] Add `POST /api/v1/reviews` (CUSTOMER role): validate `rating` is integer 1–5, `comment` ≤500 chars, no existing review for the `booking_id`; insert review; call `reviewAggregator.recalculate()`
- [~] Add `POST /api/v1/reviews/:id/reply` (PROVIDER role): validate no reply exists yet (return 409 if it does), update `provider_reply` field
- [~] In `src/routes/bookings.tsx`, for COMPLETED bookings without a review, show a "Rate & Review" button that opens a `Dialog` with `StarRating` (interactive) and comment textarea
- [~] After successful submission, replace the button with the submitted star rating display
- [~] Trigger an in-app notification prompt when booking reaches COMPLETED status (via TanStack Query `onSuccess` callback)

---


## Task 26: Admin Coupon Management UI
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 9

Create the admin coupon management interface and the underlying API endpoints. Covers Req 25.

### Subtasks
- [~] Add `GET /api/v1/admin/coupons` (ADMIN role): return all coupons ordered by `created_at DESC`
- [~] Add `POST /api/v1/admin/coupons` (ADMIN role): validate code (alphanumeric, 3–20 chars), value > 0, PERCENT value ≤100, `expires_at` in the future if provided; insert coupon
- [~] Add `PATCH /api/v1/admin/coupons/:id` (ADMIN role): allow updating `is_active`, `max_uses`, `expires_at`
- [~] Create `src/routes/admin.coupons.tsx` with a coupons data table (code, type, value, used/max, expires, active toggle)
- [~] Add a "Create Coupon" button that opens a `Dialog` with the create form; show field-level zod validation errors
- [~] Add inline "Edit" row action to update `max_uses` and `expires_at` in a sheet/dialog
- [~] Link `admin.coupons.tsx` from the admin navigation in `src/routes/admin.index.tsx`

---

## Task 27: Admin KYC Document Review UI
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 20

Create the admin KYC queue page for reviewing and approving/rejecting provider documents. Covers Req 26.

### Subtasks
- [~] Add `GET /api/v1/admin/kyc` (ADMIN role): return all providers with `onboarding_status = 'SUBMITTED'` plus their documents; support filter by `doc_type` and `status`
- [~] Update `PATCH /providers/:id/documents/:docId` to require ADMIN role (Task 6); add logic: if all required docs (AADHAAR, PAN, BANK) are APPROVED, set `providers.is_verified = 1` and `onboarding_status = 'APPROVED'`; call `notificationService.sendSms()` on approval or rejection
- [~] Add rejection reason field: `PATCH /providers/:id/documents/:docId` accepts `{ status: 'REJECTED', rejection_reason: '...' }` and stores it
- [~] Create `src/routes/admin.kyc.tsx` with a table of pending providers; each row expandable to show their 3 document cards (Aadhaar, PAN, Bank) with file link, Approve/Reject buttons
- [~] Add a pending KYC badge count to the admin navigation tab
- [~] Link `admin.kyc.tsx` from the admin navigation in `src/routes/admin.index.tsx`

---

## Task 28: Admin Payout Management UI
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 21

Create the admin payout approval interface and the approval/rejection API endpoints. Covers Req 27.

### Subtasks
- [~] Add `GET /api/v1/admin/payouts` (ADMIN role): return all payouts with optional `?status=` filter; include provider name and bank details
- [~] Add `PATCH /api/v1/admin/payouts/:id` (ADMIN role): accept `{ action: 'approve' | 'reject', rejection_reason?: string }`; on approve: set status `PROCESSING`, call payout gateway stub; on reject: set status `REJECTED`, restore `available_balance`, notify provider
- [~] Create `src/routes/admin.payouts.tsx` with a table of payout requests (provider name, amount, bank, requested_at, status)
- [~] Add Approve/Reject action buttons per row; rejection opens a `Dialog` with a reason input
- [~] Add a status filter tab row (All / Requested / Processing / Paid / Failed / Rejected)
- [~] Display total payout volume (sum of PAID payouts for current month) as a stat card
- [~] Link `admin.payouts.tsx` from the admin navigation in `src/routes/admin.index.tsx`

---

## Task 29: Admin All-Providers View with Filters
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 3, Task 6

Create the dedicated admin providers management page that uses the `/admin/providers` endpoint. Covers Req 28.

### Subtasks
- [~] Create `src/routes/admin.providers.tsx` with a data table of all providers (name, city, phone, status, verified badge, avg_rating, hourly_rate, created_at)
- [~] Add filter bar: is_verified radio (All/Verified/Unverified), city text input, status select (All/ONLINE/OFFLINE/BUSY), name search input with debounce
- [~] Add a clickable row that opens a `Sheet` (slide-in panel) with the provider's full profile, documents list, and booking history count
- [~] Add a "Verify/Unverify" toggle button in the row actions calling `PATCH /providers/:id`
- [~] Implement pagination (page/limit) with a "Load more" button or page controls
- [~] Link `admin.providers.tsx` from the admin navigation in `src/routes/admin.index.tsx`

---

## Task 30: Admin Users View
**Status:** not_started
**Priority:** low
**Dependencies:** Task 5, Task 6

Create the admin users list page. Covers Req 33 partial (observability: users visible to admin).

### Subtasks
- [~] Create `src/routes/admin.users.tsx` with a data table of all users (email, role, name, phone, city, created_at, verified status)
- [~] Fetch from `GET /admin/users` (already exists in `server/api.js`) — ensure phone is included via Task 5's JOIN fix
- [~] Add search by email/name and filter by role
- [~] Display provider sub-details (bio, hourly_rate, is_verified) inline when role = PROVIDER
- [~] Link `admin.users.tsx` from the admin navigation in `src/routes/admin.index.tsx`

---


## Task 31: Search Engine Backend and `/search` Endpoint
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 8

Create the search module and API endpoint. Covers Req 23 (backend).

### Subtasks
- [~] Create `server/search.js` exporting `async search(q, city)` — query `categories` (name LIKE `%q%`) and `providers` (name/bio/category_name LIKE `%q%`, is_verified = 1, optionally city filter); rank exact name matches first via `CASE WHEN` in ORDER BY
- [~] Add `GET /api/v1/search?q=...&city=...` (public): validate `q` length ≥ 2 (return 400 `QUERY_TOO_SHORT` otherwise), call `search.search()`, return `{ categories: [...], providers: [...] }`
- [~] Apply in-memory categories cache (60s TTL) from the performance design to the categories part of search results
- [~] Add integration with the homepage search bar in `src/routes/index.tsx`: submit navigates to `/search?q=...&city=...`

---

## Task 32: Search Results Frontend Page
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 31, Task 14

Create the `/search` route with category results and filtered provider grid. Covers Req 23 (frontend).

### Subtasks
- [~] Create `src/routes/search.tsx` — read `?q` and `?city` from search params, call `GET /search`, display results
- [~] Left/top panel: matching category cards (icon, name, "Book Now" link to `/book/$categoryId`)
- [~] Right/bottom panel: matching provider cards grid (use `ProviderCard` component) with pagination
- [~] Add a filter sidebar/sheet: city input, min rating slider, max price input; re-fetch on filter change
- [~] Show `EmptyState` component when no results found
- [~] Show `SkeletonCard` components while loading

---

## Task 33: Service Packages and Add-Ons — Schema, API, and Booking UI
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 10, Task 6

Expose packages and add-ons in the API and integrate them into the booking flow. Covers Req 24.

### Subtasks
- [~] Add `GET /api/v1/categories/:id/packages` (public): return active `service_packages` for the category
- [~] Add `GET /api/v1/categories/:id/addons` (public): return active `service_addons` for the category
- [~] Add admin endpoints: `POST /api/v1/admin/categories/:id/packages`, `POST /api/v1/admin/categories/:id/addons`, `PATCH` variants for editing (ADMIN role)
- [~] In `src/routes/book.$categoryId.tsx` Step 1 (or new Step 0), display package selector cards (name, description, duration, price); require selection before proceeding
- [~] After package selection, show add-on toggle cards; calculate running total as `package.price + sum(selected_addons.additional_price)`
- [~] Pass `package_id` and `addon_ids` array in the booking POST body; store in `bookings` table (via Task 10 migration columns)
- [~] In provider job card (`src/components/booking/BookingCard.tsx`), display selected package name and add-on names

---

## Task 34: WebSocket Server Setup
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6, Task 10

Set up the `ws` WebSocket server alongside Express, with JWT authentication on connection. Covers Req 20, 21, 22 (infrastructure).

### Subtasks
- [~] Install `ws` package (add to `package.json` dependencies with pinned version)
- [~] In `server/api.js`, create an `http.Server` wrapping the Express app; attach a `WebSocketServer` on `{ server, path: '/ws' }`
- [~] On WebSocket connection, extract `?token=` query param from the upgrade URL, verify JWT; close connection with code 4001 if invalid
- [~] Populate `ws.user = { id, role }` on authenticated connections; maintain an in-memory `Map<userId, ws>` for message routing
- [~] Maintain a `Map<bookingId, { lat, lng, updatedAt }>` for GPS tracking state
- [~] Implement message dispatcher: route by `message.type` to GPS handler, chat handler, notification handler
- [~] Export `broadcast(userId, data)` helper for use by other server modules

---

## Task 35: GPS Tracking Frontend
**Status:** not_started
**Priority:** low
**Dependencies:** Task 34, Task 17

Add live provider location tracking to the booking detail view. Covers Req 20.

### Subtasks
- [~] Create `src/lib/useWebSocket.ts` hook: connect to `ws://localhost:4001/ws?token=...`, handle reconnect with 30s backoff, return `{ send, lastMessage, readyState }`
- [~] In `src/routes/bookings.tsx`, for CONFIRMED/IN_PROGRESS bookings, add a "Track Provider" button that opens a tracking map panel
- [~] Tracking panel: display provider coordinates on a static map (use an `<img>` with a static map API URL or a simple lat/lng display as a placeholder); show ETA placeholder text
- [~] Provider side: in `src/routes/provider.jobs.tsx`, for ACTIVE jobs, use `navigator.geolocation.watchPosition` and send `{ type: 'location', bookingId, lat, lng }` via WebSocket every 10 seconds
- [~] Show "Location unavailable" message when WebSocket disconnects; attempt reconnect every 30 seconds
- [~] On booking COMPLETED/CANCELLED, close WebSocket tracking session

---

## Task 36: In-App Chat UI
**Status:** not_started
**Priority:** low
**Dependencies:** Task 34

Add the per-booking chat interface for customer-provider messaging. Covers Req 22.

### Subtasks
- [~] Add `GET /api/v1/bookings/:id/messages` (auth required, customer or provider on that booking): return last 50 messages ordered by `created_at ASC`
- [~] On WebSocket message `{ type: 'chat', bookingId, content }`: validate sender is customer or provider on that booking, validate `content` length ≤1000 chars, sanitize via `stripHtml`, persist to `chat_messages`, broadcast to the other party's WebSocket connection
- [~] Return 403 when booking status is COMPLETED or CANCELLED
- [~] Create `src/components/shared/ChatPanel.tsx`: message list (scroll-to-bottom on new message), text input + send button, loads history via `useQuery` on mount
- [~] Add a "Chat" button to `BookingCard` in both customer bookings view and provider jobs view; clicking opens `ChatPanel` in a `Sheet` or `Dialog`
- [~] Replay offline messages on reconnect by re-fetching `/bookings/:id/messages`

---


## Task 37: Redesign Navbar Component
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 14

Upgrade the Navbar to a premium Snabbit-quality sticky glassmorphism nav with city selector, search, and role-aware navigation links.

### Subtasks
- [~] Redesign `src/components/layout/Navbar.tsx`: sticky top with `backdrop-blur` glassmorphism, dark navy-to-teal gradient on scroll
- [~] Add city selector dropdown (driven by `useCity()` context from Task 14) on the left side
- [~] Add a compact keyword search input that navigates to `/search?q=...&city=...` on submit
- [~] Show role-appropriate nav links: Customer → My Bookings, Profile; Provider → Dashboard, Jobs, Earnings; Admin → Dashboard; all roles → logout
- [~] Add avatar/initials badge for authenticated users with a dropdown menu (profile, settings, logout)
- [~] Ensure mobile responsiveness: collapse links into a hamburger `Sheet` on small screens

---

## Task 38: Redesign Home Page
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 14, Task 24, Task 37

Completely redesign the home page with hero section, services grid, stats strip, top-rated pros, trust section, testimonials, and provider CTA. Covers Req 8 homepage city selector.

### Subtasks
- [~] Redesign `src/routes/index.tsx` hero: full-viewport dark navy-to-teal gradient, H1 "House Help in 10 Minutes", subhead, pill-shaped search bar (city + keyword + Search button), three trust badges (Verified, 10-min, Guaranteed)
- [~] Services grid: 2-row horizontal scroll on mobile, 3-col grid on desktop; each card shows category icon, name, "from ₹X" base price, hover lift animation
- [~] How It Works section: 3 numbered steps with dashed connecting line
- [~] Stats strip: "120K+ Customers | 15K+ Verified Pros | 4.8/5 Rating | 22 Cities" on a dark background
- [~] Top Rated Pros: city filter tab row, 6 provider cards grid (use `ProviderCard`), "View all" link to `/search`
- [~] Trust / Why HomeHero: 6-card grid (Background Verified, Service Guarantee, 24/7 Support, Flexible Slots, Trained Pros, Transparent Pricing)
- [~] Testimonials: 3 quote cards with customer name, avatar initials, rating stars
- [~] Provider CTA strip: "Earn ₹25,000+/month as a HomeHero Pro" with dark background and sign-up link

---

## Task 39: Redesign Booking Flow (3-Step Wizard)
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 13, Task 14, Task 15, Task 33

Overhaul the booking flow UI in `book.$categoryId.tsx` with a polished 3-step wizard including packages, providers, calendar, and payment. Covers Req 7 (TimeSlotGrid), Req 9 (payment UI), Req 24 (packages UI).

### Subtasks
- [~] Add a numbered progress bar (Step 1 / Step 2 / Step 3) with connecting lines at the top of `src/routes/book.$categoryId.tsx`
- [~] Step 1 — Choose Package & Provider: package selector cards (from Task 33), then provider cards grid with sort bar (rating/price/experience); selected provider highlighted with primary-color border
- [~] Step 2 — Schedule: two-column layout — inline calendar (left) using `react-day-picker`, `TimeSlotGrid` grouped by Morning/Afternoon/Evening (right); address textarea + pin code input; Notes textarea; address book selector from Task 22
- [~] Step 3 — Confirm & Pay: provider mini-card, schedule summary, coupon input with Apply button (calls `/coupons/validate`), price breakdown (service fee, discount, platform fee, total), payment method icons (visual), "Pay ₹X" CTA button
- [~] Integrate availability fetching in Step 2 (from Task 13) to disable booked slots
- [~] On "Pay" click, trigger payment flow from Task 17

---

## Task 40: Redesign My Bookings Page
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 25, Task 35, Task 36

Polish the bookings history page with tabs, status badges, and review/cancel/chat actions.

### Subtasks
- [~] Redesign `src/routes/bookings.tsx` with Tabs: Upcoming | Completed | Cancelled
- [~] Each booking card: category icon, service name, provider avatar + name, date/time, address, `StatusBadge`, total amount
- [~] UPCOMING card: "Cancel" button (calls `PATCH /bookings/:id` with status CANCELLED), "Track Provider" button (Task 35)
- [~] COMPLETED card without review: "Rate & Review" button (opens review dialog from Task 25), "Chat" button (Task 36)
- [~] COMPLETED card with review: show submitted star rating inline
- [~] Empty state per tab using `EmptyState` component with tab-appropriate message and CTA
- [~] Use `SkeletonCard` while loading

---

## Task 41: Redesign Provider Dashboard and Jobs Pages
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 19, Task 21, Task 25

Polish the provider dashboard and job board with stats, charts, and improved job management UX.

### Subtasks
- [~] Redesign `src/routes/provider.index.tsx`: Online/Offline pill toggle (Task 19), stats row (Today's Earnings / Total Earned / Active Jobs / Avg Rating), quick actions grid, upcoming jobs list (next 3), Recharts BarChart for earnings by week, verification banner
- [~] Redesign `src/routes/provider.jobs.tsx`: Tabs — New | Active | Completed; each job card shows customer name, service, address, scheduled time, earnings
- [~] New tab: Accept / Decline buttons; Decline opens a reason input dialog
- [~] Active tab: "Mark Started" button → transitions booking to `IN_PROGRESS`; "Mark Completed" button → transitions to `COMPLETED` and triggers wallet ledger (Task 18)
- [~] Completed tab: shows earnings amount and review received (if any)
- [~] Add "Chat" button to each active/new job card (Task 36)

---

## Task 42: Redesign Auth Pages
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 12

Redesign the login and signup pages with a modern split-layout design.

### Subtasks
- [~] Redesign `src/routes/auth.login.tsx`: split layout — left dark panel with HomeHero branding/tagline, right panel with login form; include Phone OTP tab from Task 12
- [~] Redesign `src/routes/auth.signup-customer.tsx`: same split layout; form fields name, email, phone, password, city; zod validation inline errors
- [~] Redesign `src/routes/auth.signup-provider.tsx`: same split layout; show a "Start earning" value proposition on the left panel
- [~] Add "Forgot password" link (placeholder — no backend flow required yet)
- [~] Ensure all forms are accessible (proper `<label>` associations, aria attributes)

---

## Task 43: Redesign Provider Profile Page
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 4, Task 5

Polish the public provider profile page with all categories displayed, multi-category booking selector, and reviews.

### Subtasks
- [~] Redesign `src/routes/providers.$providerId.tsx`: hero section with avatar, name, city, `VerifiedBadge`, avg rating, review count, hourly rate
- [~] Display all offered service categories as cards (name + custom price)
- [~] Implement multi-category booking selector from Task 4 (dropdown or card list when multiple categories)
- [~] Reviews section: list of `ReviewCard` components; show provider reply if present
- [~] Show provider phone number masked to last 4 digits (from Task 5)
- [~] Add `SkeletonCard` loading state

---

## Task 44: Add New Shared Components
**Status:** not_started
**Priority:** medium
**Dependencies:** none

Complete the shared component library with the components referenced throughout the design: `StarRating`, `Footer`, plus verify/complete `SkeletonCard`, `StatusBadge`, `BookingCard`.

### Subtasks
- [~] Create `src/components/shared/StarRating.tsx`: filled/empty star row, supports `interactive` prop with `onChange` callback for review forms, `value` (0–5), `size` (px), `max` (default 5)
- [~] Create `src/components/layout/Footer.tsx`: links (About, Services, Become a Pro, Contact), app store badges (visual), social icons, copyright; use on all pages via `__root.tsx`
- [~] Verify `src/components/shared/SkeletonCard.tsx` matches `ProviderCard` dimensions with shimmer animation; update if needed
- [~] Verify `src/components/shared/StatusBadge.tsx` implements the full colour map (PENDING→amber, CONFIRMED→blue, IN_PROGRESS→purple, COMPLETED→emerald, CANCELLED→red) with `sm` and `md` size variants
- [~] Verify `src/components/booking/BookingCard.tsx` accepts the `BookingCardProps` interface (`booking`, `mode: 'customer' | 'provider'`, `onStatusChange`, `onReview`) and renders correctly for both modes
- [~] Add `Footer` to the layout in `src/routes/__root.tsx`

---


## Task 45: Performance — DB Indexes, Connection Pooling, and Categories Cache
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 10

Apply all performance optimisations defined in the design: indexes (via migration), connection pool config, in-memory categories cache, and pagination defaults. Covers Req 32.

### Subtasks
- [~] Confirm migration in Task 10 includes all 4 indexes: `bookings(provider_id, scheduled_date, scheduled_time, status)`, `bookings(customer_id)`, `providers(status, is_verified)`, `chat_messages(booking_id)`
- [~] In `server/db.js`, configure `mysql2.createPool` with `connectionLimit: 50, waitForConnections: true, queueLimit: 0`; export both `pool` and a `query` helper
- [~] Create `server/cache.js` with an in-memory `Map` for categories: `getCategories()` checks the cache (60s TTL) before querying DB; invalidate on category create/update
- [~] Replace direct `pool.query('SELECT * FROM categories...')` in `server/api.js` with `cache.getCategories()`
- [~] Ensure all list endpoints (`/providers`, `/bookings`, `/admin/users`, `/admin/providers`) accept `?page` and `?limit` with defaults (`page=1`, `limit=20`) and max limit 100; add `LIMIT ? OFFSET ?` to queries

---

## Task 46: Observability — Structured Error Responses and Request Logging
**Status:** not_started
**Priority:** medium
**Dependencies:** Task 6

Add a global error handler middleware, structured JSON error format, and request logging. Covers Req 33.

### Subtasks
- [~] Create `server/middleware/errorHandler.js` exporting an Express 4-argument error middleware `(err, req, res, next)`: log `{ timestamp, method, path, error: err.message, stack: err.stack }` to console; return `{ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }` without stack trace in response
- [~] Register `errorHandler` as the last middleware in `server/api.js`
- [~] Replace all ad-hoc `res.status(4xx).json({ error: '...' })` with a consistent `{ error: 'MACHINE_CODE', message: 'Human description.' }` format across all routes in `server/api.js`
- [~] Add a request logger middleware (before routes): log `{ timestamp, method, path, ip }` for every request
- [~] Log all booking lifecycle events (created, confirmed, completed, cancelled) with `booking_id`, `customer_id`, `provider_id`, `timestamp` inside the relevant route handlers
- [~] Update `GET /api/v1/health` to also check DB connectivity by running `SELECT 1` and returning `{ status: 'ok', db: 'connected' }` or `{ status: 'degraded', db: 'unreachable' }` with HTTP 503

---

## Task 47: Data Integrity — Wrap Multi-Table Writes in Transactions
**Status:** not_started
**Priority:** high
**Dependencies:** Task 17, Task 18, Task 15

Ensure all multi-table writes use explicit DB transactions with rollback on failure. Covers Req 34.

### Subtasks
- [~] In `POST /payments/verify` (Task 17): wrap booking confirmation + payment status update + wallet ledger call + coupon used_count increment in a single transaction; rollback on any failure
- [~] In `PATCH /bookings/:id` status → COMPLETED: wrap wallet update + transactions insert in a transaction using `SELECT ... FOR UPDATE` on `provider_wallet`
- [~] In `POST /bookings` (with auto-dispatch): wrap booking INSERT + wallet pending update + notification trigger in a transaction
- [~] In `POST /addresses` when `is_default = true`: wrap the "clear other defaults" + "set new default" updates in a transaction
- [~] In `POST /subscriptions`: wrap subscription creation + initial session count in a transaction
- [~] Add a global `pool.getConnection()` + `conn.beginTransaction()` + `try/catch/finally conn.release()` pattern helper in `server/db.js` as `withTransaction(callback)` to standardise transaction usage across all modules

---
