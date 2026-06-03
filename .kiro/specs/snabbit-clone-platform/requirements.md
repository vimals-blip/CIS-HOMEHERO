# Requirements Document — Snabbit Clone Platform (HomeHero)

## Introduction

HomeHero is an on-demand home services marketplace modelled after Snabbit (https://www.snabbit.com/).
The platform connects customers who need high-frequency household services (cleaning, dishwashing,
laundry, kitchen help, bathroom cleaning, and more) with background-verified, Aadhaar-verified,
professionally trained service providers. The core promise is provider arrival within ~10 minutes of
booking, instant auto-dispatch (no manual provider selection by the customer), real-time GPS tracking,
transparent pricing, and a service guarantee.

This document covers:
1. Security hardening and bug fixes identified in the existing HomeHero codebase.
2. All missing features required to reach Snabbit feature parity.
3. Correctness properties for property-based testing.

Three user roles are in scope: **Customer**, **Provider**, and **Admin**.

---

## Glossary

- **System**: The HomeHero platform (frontend + backend API + database).
- **Customer**: A registered user who books home services.
- **Provider**: A registered, background-verified service professional.
- **Admin**: A platform operator with elevated privileges.
- **Booking**: A confirmed service request linking a Customer, Provider, and Category.
- **Category**: A type of home service (e.g., "Deep Cleaning", "Dishwashing").
- **Coupon**: A discount code with a type (FLAT or PERCENT), value, usage limit, and expiry.
- **Subscription**: A recurring membership plan granting a fixed number of service sessions per month.
- **Wallet**: A Provider's in-platform earnings ledger (pending_balance, available_balance, total_earned).
- **KYC**: Know Your Customer — the document verification process for Providers (Aadhaar, PAN, Bank).
- **OTP**: One-Time Password sent via SMS for phone-based authentication.
- **JWT**: JSON Web Token used for stateless API authentication.
- **Payout**: A transfer of available_balance from a Provider's Wallet to their registered bank account.
- **Pin_Code**: A 6-digit Indian postal code used for geographic service-area matching.
- **Dispatcher**: The System component responsible for auto-matching a booking to an available Provider.
- **Auth_Middleware**: The Express middleware that validates JWT tokens on protected API routes.
- **Rate_Limiter**: The middleware that enforces request-per-window limits on sensitive endpoints.
- **Sanitizer**: The module that strips dangerous characters from user-supplied text inputs.
- **Coupon_Validator**: The server-side module that validates and applies coupon discounts.
- **Wallet_Ledger**: The module that updates Provider wallet balances when booking status changes.
- **Review_Aggregator**: The module that recalculates a Provider's avg_rating after each review.
- **Payment_Gateway**: The Razorpay integration module handling order creation and payment verification.
- **Address_Book**: The Customer's collection of saved delivery addresses.
- **Notification_Service**: The module that sends push notifications, SMS, and in-app alerts.
- **Chat_Service**: The module that handles real-time Customer↔Provider messaging per booking.
- **Search_Engine**: The module that queries providers and categories by keyword and city.

---

## Requirements


### Requirement 1: Security — API Authentication Middleware

**User Story:** As a Customer or Provider, I want all my private data to be protected, so that
unauthenticated users cannot read or modify bookings, profiles, or wallet data.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL verify the JWT signature and expiry on every API route that is not
   explicitly public (health check, categories list, provider public profile, auth endpoints).
2. WHEN a request arrives without an Authorization header on a protected route, THE Auth_Middleware
   SHALL return HTTP 401 with error code `UNAUTHENTICATED`.
3. WHEN a request arrives with an expired or malformed JWT on a protected route, THE Auth_Middleware
   SHALL return HTTP 401 with error code `TOKEN_INVALID`.
4. WHEN a Customer attempts to access an Admin-only route, THE Auth_Middleware SHALL return HTTP 403
   with error code `FORBIDDEN`.
5. WHEN a Provider attempts to access a Customer-only route (e.g., create booking), THE Auth_Middleware
   SHALL return HTTP 403 with error code `FORBIDDEN`.
6. THE System SHALL require the `JWT_SECRET` environment variable to be set at startup; IF the variable
   is absent or equals the literal string `dev-secret`, THEN THE System SHALL refuse to start in
   production mode and log a fatal error.

#### Correctness Properties

- **Property 1.A — Token Rejection Universality**: For any string that is not a validly signed JWT
  issued by the System, THE Auth_Middleware SHALL return 401. (Property-based: generate random strings,
  tampered tokens, tokens signed with wrong secrets — all must be rejected.)
- **Property 1.B — Role Enforcement**: For any valid JWT with role R and any route requiring role R',
  access is granted if and only if R == R' (or R == ADMIN for admin routes). (Property-based: generate
  tokens for all role combinations and verify correct allow/deny for every route category.)

---

### Requirement 2: Security — Rate Limiting on Authentication Endpoints

**User Story:** As a platform operator, I want brute-force attacks on login and OTP endpoints to be
blocked, so that user accounts are protected from credential stuffing.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL allow a maximum of 10 login attempts per IP address within any 15-minute
   sliding window.
2. WHEN an IP address exceeds 10 login attempts within 15 minutes, THE Rate_Limiter SHALL return
   HTTP 429 with a `Retry-After` header indicating the seconds until the window resets.
3. THE Rate_Limiter SHALL allow a maximum of 5 OTP send requests per phone number within any
   10-minute sliding window.
4. WHEN a phone number exceeds 5 OTP requests within 10 minutes, THE Rate_Limiter SHALL return
   HTTP 429 and SHALL NOT send an additional SMS.
5. THE Rate_Limiter SHALL apply independently per IP address and per phone number.

---

### Requirement 3: Security — Input Sanitization

**User Story:** As a platform operator, I want all user-supplied text to be sanitized before
persistence, so that XSS and injection attacks cannot compromise the platform.

#### Acceptance Criteria

1. THE Sanitizer SHALL strip HTML tags and JavaScript event attributes from all text fields before
   database insertion (booking address, notes, provider bio, review comment, chat messages).
2. THE System SHALL use parameterized queries for all database operations; no user-supplied value
   SHALL be interpolated directly into a SQL string.
3. THE System SHALL validate the `limit` query parameter on `/providers` as a positive integer in
   the range [1, 100] before use; IF the value is outside this range or non-numeric, THEN THE System
   SHALL use the default value of 20.
4. THE System SHALL validate and sanitize the `address` and `notes` fields on booking creation;
   IF either field exceeds 1000 characters, THEN THE System SHALL return HTTP 400.

#### Correctness Properties

- **Property 3.A — Sanitization Idempotence**: For any input string S, Sanitizer(Sanitizer(S)) ==
  Sanitizer(S). Applying sanitization twice must produce the same result as applying it once.
- **Property 3.B — SQL Safety**: For any value V passed as a query parameter, the resulting SQL
  query must not contain unescaped single quotes, semicolons, or SQL keywords injected from V.
  (Property-based: generate strings with SQL injection payloads — all must be safely parameterized.)

---

### Requirement 4: Security — CSRF Protection

**User Story:** As a Customer, I want state-changing requests to require a valid session token, so
that malicious third-party sites cannot submit actions on my behalf.

#### Acceptance Criteria

1. THE System SHALL enforce SameSite=Strict on all session cookies.
2. WHEN a state-changing request (POST, PUT, PATCH, DELETE) arrives without a valid Authorization
   header containing a JWT, THE Auth_Middleware SHALL reject the request with HTTP 401.
3. THE System SHALL set the `Content-Type: application/json` requirement on all API endpoints;
   IF a request arrives with `Content-Type: application/x-www-form-urlencoded`, THEN THE System
   SHALL return HTTP 415.

---

### Requirement 5: Authentication — Phone OTP Login

**User Story:** As a Customer or Provider, I want to log in using my phone number and a one-time
password, so that I do not need to remember an email and password.

#### Acceptance Criteria

1. WHEN a user submits a valid 10-digit Indian mobile number, THE System SHALL generate a 6-digit
   numeric OTP, store a hashed version with a 10-minute expiry, and send the OTP via SMS through
   the Notification_Service.
2. WHEN a user submits the correct OTP within 10 minutes of generation, THE System SHALL issue a
   JWT and return the user's profile and role.
3. WHEN a user submits an incorrect OTP, THE System SHALL return HTTP 401 with error code
   `OTP_INVALID` and increment the attempt counter for that phone number.
4. WHEN a user submits an OTP after its 10-minute expiry, THE System SHALL return HTTP 401 with
   error code `OTP_EXPIRED`.
5. WHEN a user submits an OTP after 5 consecutive incorrect attempts, THE System SHALL return
   HTTP 429 with error code `OTP_MAX_ATTEMPTS` and SHALL NOT accept further OTP submissions for
   that phone number for 30 minutes.
6. THE System SHALL support both phone-OTP and email-password authentication; existing email/password
   accounts SHALL remain functional.

#### Correctness Properties

- **Property 5.A — OTP Round-Trip**: For any valid phone number P, generating an OTP and immediately
  verifying it with the correct value must succeed. (Round-trip property.)
- **Property 5.B — OTP Rejection**: For any OTP value that is not the most recently generated OTP
  for phone P, verification must return OTP_INVALID or OTP_EXPIRED.


---

### Requirement 6: Booking — Instant Auto-Dispatch (Snabbit Core Feature)

**User Story:** As a Customer, I want the platform to automatically assign the nearest available
verified Provider to my booking, so that I do not need to manually browse and select a provider.

#### Acceptance Criteria

1. WHEN a Customer submits a booking request with a category, address, and pin code, THE Dispatcher
   SHALL query all Providers who are ONLINE, verified, serve the requested category, and whose
   service pin codes include the booking pin code.
2. WHEN one or more eligible Providers are found, THE Dispatcher SHALL select the Provider with the
   highest avg_rating among those with the fewest active bookings, and SHALL assign the booking to
   that Provider within 5 seconds.
3. WHEN no eligible Provider is found within 5 seconds, THE Dispatcher SHALL return HTTP 503 with
   error code `NO_PROVIDER_AVAILABLE` and SHALL NOT create a booking record.
4. WHEN a Provider is auto-assigned, THE Notification_Service SHALL send a push notification to
   the Provider within 2 seconds of assignment.
5. WHEN a Provider does not accept or reject the booking within 60 seconds, THE Dispatcher SHALL
   re-dispatch to the next eligible Provider and SHALL notify the Customer of the re-dispatch.
6. THE System SHALL allow Customers to optionally browse and manually select a Provider as an
   alternative to auto-dispatch, controlled by a feature flag.

#### Correctness Properties

- **Property 6.A — Assignment Validity**: For any auto-dispatched booking B, the assigned Provider P
  must satisfy: P.status == ONLINE AND P.is_verified == true AND P serves B.category_id AND
  B.pin_code ∈ P.pin_codes. (Invariant: no booking is ever assigned to an ineligible provider.)
- **Property 6.B — No Double Assignment**: For any two concurrent bookings B1 and B2 assigned to
  the same Provider P at the same scheduled_date and scheduled_time, the second assignment must be
  rejected. (Invariant: a Provider cannot have two CONFIRMED bookings with overlapping time slots.)

---

### Requirement 7: Booking — Double-Booking Prevention

**User Story:** As a Provider, I want the system to prevent two bookings from being scheduled at
the same time, so that I am never double-booked.

#### Acceptance Criteria

1. WHEN a booking is created for Provider P on date D at time slot T, THE System SHALL check for
   existing PENDING or CONFIRMED bookings for P on date D that overlap with slot T.
2. IF an overlapping booking exists, THEN THE System SHALL return HTTP 409 with error code
   `SLOT_UNAVAILABLE` and SHALL NOT create the new booking.
3. THE System SHALL expose a `/providers/:id/availability?date=YYYY-MM-DD` endpoint that returns
   the list of booked time slots for that Provider on that date.
4. THE TimeSlotGrid component SHALL fetch availability from the endpoint in Acceptance Criterion 3
   and SHALL disable already-booked slots before rendering.

#### Correctness Properties

- **Property 7.A — No Overlap Invariant**: For any Provider P, at no point in time shall the
  database contain two bookings for P with the same scheduled_date and the same scheduled_time
  where both have status PENDING, CONFIRMED, or IN_PROGRESS.

---

### Requirement 8: Booking — City-Based Provider Filtering

**User Story:** As a Customer, I want to only see Providers who operate in my selected city, so
that I do not accidentally book a Provider who cannot reach me.

#### Acceptance Criteria

1. WHEN a Customer selects a city on the homepage or booking flow, THE System SHALL filter all
   Provider queries to return only Providers whose profile city matches the selected city.
2. THE `/providers` API endpoint SHALL accept an optional `city` query parameter; WHEN provided,
   THE System SHALL return only Providers with a matching city value.
3. THE booking creation endpoint SHALL validate that the assigned Provider's city matches the
   booking address city; IF they do not match, THEN THE System SHALL return HTTP 422 with error
   code `PROVIDER_CITY_MISMATCH`.
4. THE homepage city selector SHALL persist the selected city in localStorage and SHALL apply it
   to all subsequent provider and category queries during the session.

#### Correctness Properties

- **Property 8.A — City Filter Completeness**: For any city value C and any response from
  `/providers?city=C`, every Provider in the response must have profile.city == C.

---

### Requirement 9: Booking — Payment-Before-Confirmation Flow

**User Story:** As a Customer, I want my booking to be confirmed only after my payment succeeds,
so that I am never charged for a booking that was not confirmed.

#### Acceptance Criteria

1. WHEN a Customer initiates a booking, THE System SHALL create a Razorpay order via the
   Payment_Gateway and return the Razorpay order_id to the frontend; the booking record SHALL be
   created with status `PAYMENT_PENDING`.
2. WHEN the Customer completes payment in the Razorpay checkout, THE frontend SHALL send the
   Razorpay payment_id, order_id, and signature to the System's payment verification endpoint.
3. WHEN the System verifies the Razorpay signature successfully, THE System SHALL update the
   booking status to `CONFIRMED` and the payment record status to `PAID` in a single database
   transaction.
4. IF the Razorpay signature verification fails, THEN THE System SHALL update the payment record
   status to `FAILED`, SHALL NOT confirm the booking, and SHALL return HTTP 402 with error code
   `PAYMENT_VERIFICATION_FAILED`.
5. WHEN a booking reaches status `CONFIRMED`, THE Notification_Service SHALL send a confirmation
   SMS and push notification to both the Customer and the assigned Provider.
6. THE System SHALL expose a webhook endpoint for Razorpay payment events; WHEN a `payment.captured`
   event is received, THE System SHALL confirm the associated booking if not already confirmed.

#### Correctness Properties

- **Property 9.A — Confirmation Requires Payment**: For any booking B in the database, if
  B.status == CONFIRMED then there must exist a payment record with booking_id == B.id and
  status == PAID. (Invariant: no booking is ever CONFIRMED without a verified payment.)

---

### Requirement 10: Booking — Server-Side Coupon Validation

**User Story:** As a Customer, I want coupon discounts to be calculated and validated on the server,
so that I cannot manipulate the discount amount in the browser.

#### Acceptance Criteria

1. THE Coupon_Validator SHALL expose a `/coupons/validate` endpoint that accepts a coupon code and
   booking amount and returns the discount amount and final total.
2. WHEN a coupon code is submitted, THE Coupon_Validator SHALL verify: the code exists, is_active
   is true, expires_at is in the future (or null), and used_count is less than max_uses (or max_uses
   is null).
3. IF any validation check fails, THEN THE Coupon_Validator SHALL return HTTP 422 with a specific
   error code: `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_EXHAUSTED`, or `COUPON_INACTIVE`.
4. WHEN a booking is created with a coupon_code, THE System SHALL re-validate the coupon server-side
   and recalculate the total_amount; IF the client-submitted total_amount does not match the
   server-calculated total, THE System SHALL use the server-calculated total.
5. WHEN a booking with a valid coupon is confirmed (payment PAID), THE System SHALL increment the
   coupon's used_count by 1 in the same database transaction as the booking confirmation.

#### Correctness Properties

- **Property 10.A — Discount Calculation Correctness**: For any PERCENT coupon with value V and
  booking amount A, discount == floor(A * V / 100). For any FLAT coupon with value V and booking
  amount A, discount == min(V, A). (Property-based: generate random amounts and coupon values,
  verify formula holds for all inputs.)
- **Property 10.B — Exhausted Coupon Rejection**: For any coupon with used_count >= max_uses,
  the Coupon_Validator must return COUPON_EXHAUSTED regardless of other fields.


---

### Requirement 11: Provider — Wallet Update on Booking Completion

**User Story:** As a Provider, I want my wallet balance to be updated automatically when a booking
is marked complete, so that my earnings are always accurate.

#### Acceptance Criteria

1. WHEN a booking status is updated to `COMPLETED`, THE Wallet_Ledger SHALL update the Provider's
   wallet in the same database transaction: pending_balance SHALL decrease by provider_amount,
   available_balance SHALL increase by provider_amount, and total_earned SHALL increase by
   provider_amount.
2. WHEN a booking status is updated to `CANCELLED` after payment was captured, THE Wallet_Ledger
   SHALL initiate a Razorpay refund for the full total_amount and SHALL NOT credit the Provider's
   wallet.
3. THE System SHALL create a transaction record of type `CREDIT` for the Provider and type `DEBIT`
   for the platform fee in the transactions table when a booking is COMPLETED.
4. WHEN a booking is created and payment is confirmed, THE Wallet_Ledger SHALL add provider_amount
   to the Provider's pending_balance to reflect earnings in transit.

#### Correctness Properties

- **Property 11.A — Wallet Balance Invariant**: For any Provider P, at all times:
  P.wallet.total_earned == sum of provider_amount for all COMPLETED bookings assigned to P.
  (Invariant: total_earned is always the exact sum of completed booking provider amounts.)
- **Property 11.B — Balance Non-Negative**: For any Provider P, P.wallet.available_balance >= 0
  and P.wallet.pending_balance >= 0 at all times.

---

### Requirement 12: Provider — Online/Offline Status Management

**User Story:** As a Provider, I want to toggle my availability status from the app, so that I
only receive bookings when I am ready to work.

#### Acceptance Criteria

1. THE Provider dashboard SHALL display the Provider's current status (ONLINE, OFFLINE, BUSY) and
   a toggle control to switch between ONLINE and OFFLINE.
2. WHEN a Provider sets status to ONLINE, THE System SHALL update providers.status to `ONLINE` and
   SHALL begin including the Provider in Dispatcher queries.
3. WHEN a Provider sets status to OFFLINE, THE System SHALL update providers.status to `OFFLINE`
   and SHALL exclude the Provider from all new Dispatcher queries immediately.
4. WHEN a Provider has an active booking (status IN_PROGRESS), THE System SHALL automatically set
   the Provider's status to `BUSY` and SHALL prevent the Provider from manually setting status to
   ONLINE until the booking is COMPLETED or CANCELLED.
5. THE System SHALL record the timestamp of each status change in a provider_status_log table for
   operational analytics.

---

### Requirement 13: Provider — Geolocation and Pin-Code Radius Matching

**User Story:** As a Provider, I want to define the pin codes I serve, so that I only receive
bookings within my reachable area.

#### Acceptance Criteria

1. THE Provider onboarding and profile edit screens SHALL allow a Provider to add and remove
   pin codes from their service area (minimum 1, maximum 20 pin codes).
2. THE System SHALL validate that each submitted pin code is a 6-digit numeric string matching
   a known Indian postal code; IF invalid, THE System SHALL return HTTP 422 with error code
   `INVALID_PIN_CODE`.
3. THE Dispatcher SHALL only match a booking to a Provider whose pin_codes JSON array contains
   the booking's pin code.
4. WHERE a Provider enables GPS-based matching, THE System SHALL accept the Provider's current
   latitude and longitude and SHALL compute the distance to the booking address; THE Dispatcher
   SHALL prefer Providers within 5 km of the booking address.

#### Correctness Properties

- **Property 13.A — Distance Symmetry**: For any two coordinates A and B,
  distance(A, B) == distance(B, A).
- **Property 13.B — Distance Triangle Inequality**: For any three coordinates A, B, C,
  distance(A, C) <= distance(A, B) + distance(B, C).
- **Property 13.C — Self-Distance**: For any coordinate A, distance(A, A) == 0.

---

### Requirement 14: Provider — Onboarding Wizard

**User Story:** As a new Provider, I want a guided step-by-step onboarding flow after signup, so
that I can complete my profile, upload documents, and start receiving bookings quickly.

#### Acceptance Criteria

1. WHEN a Provider completes signup, THE System SHALL redirect the Provider to a multi-step
   onboarding wizard with the following steps: (1) Personal details, (2) Service categories and
   pricing, (3) Service area pin codes, (4) Document upload (Aadhaar, PAN, Bank), (5) Review and
   submit.
2. THE System SHALL persist the Provider's progress at each step so that the Provider can resume
   the wizard after closing the browser.
3. WHEN a Provider completes all steps and submits, THE System SHALL set the Provider's onboarding
   status to `SUBMITTED` and SHALL notify the Admin queue for KYC review.
4. WHILE a Provider's onboarding status is not `APPROVED`, THE System SHALL display a pending
   verification banner on the Provider dashboard and SHALL prevent the Provider from going ONLINE.
5. THE System SHALL send an SMS notification to the Provider when their KYC is approved or rejected.

---

### Requirement 15: Provider — Earnings and Payout Management

**User Story:** As a Provider, I want to request a payout of my available earnings to my registered
bank account, so that I can access my income.

#### Acceptance Criteria

1. THE Provider dashboard SHALL display the wallet summary: total_earned, available_balance, and
   pending_balance.
2. WHEN a Provider submits a payout request for amount A, THE System SHALL validate that A is
   greater than 0 and less than or equal to available_balance; IF not, THE System SHALL return
   HTTP 422 with error code `INSUFFICIENT_BALANCE`.
3. WHEN a valid payout request is submitted, THE System SHALL create a payout record with status
   `REQUESTED`, deduct A from available_balance, and notify the Admin.
4. WHEN an Admin approves a payout, THE System SHALL update the payout status to `PROCESSING` and
   initiate a bank transfer via the configured payout provider (Razorpay X or manual).
5. WHEN a payout transfer is confirmed, THE System SHALL update the payout status to `PAID` and
   create a DEBIT transaction record.
6. IF a payout transfer fails, THEN THE System SHALL update the payout status to `FAILED`, restore
   the deducted amount to available_balance, and notify the Provider.

#### Correctness Properties

- **Property 15.A — Payout Balance Invariant**: For any Provider P, after a payout of amount A is
  REQUESTED: P.wallet.available_balance_after == P.wallet.available_balance_before - A.
- **Property 15.B — Insufficient Balance Rejection**: For any payout request where A >
  available_balance, the System must return INSUFFICIENT_BALANCE.


---

### Requirement 16: Customer — Address Book

**User Story:** As a Customer, I want to save multiple home addresses and select one at booking
time, so that I do not need to type my address for every booking.

#### Acceptance Criteria

1. THE System SHALL allow a Customer to create, read, update, and delete saved addresses; each
   address SHALL have: label (e.g., "Home", "Office"), full_address text, pin_code, city, and
   an is_default flag.
2. WHEN a Customer marks an address as default, THE System SHALL set is_default = true for that
   address and is_default = false for all other addresses belonging to the same Customer.
3. THE booking flow SHALL display the Customer's saved addresses as selectable options; WHEN a
   saved address is selected, THE System SHALL pre-fill the address and pin_code fields.
4. THE System SHALL support Google Maps Places Autocomplete on the address input field to assist
   manual address entry.
5. IF a Customer has no saved addresses, THE System SHALL prompt the Customer to enter an address
   manually during booking.

#### Correctness Properties

- **Property 16.A — Single Default Invariant**: For any Customer C, at most one address in C's
  Address_Book may have is_default == true at any point in time.
- **Property 16.B — Address Round-Trip**: For any address A created by Customer C, retrieving
  C's address list must include A with all fields unchanged.

---

### Requirement 17: Customer — Profile Management

**User Story:** As a Customer, I want to view and edit my profile (name, phone, city, avatar), so
that my account information stays current.

#### Acceptance Criteria

1. THE System SHALL provide a `/profile` route accessible to authenticated Customers displaying
   name, email, phone, city, and avatar.
2. WHEN a Customer submits a profile update, THE System SHALL validate: name is 2–100 characters,
   phone is a valid 10-digit Indian mobile number, city is a non-empty string up to 100 characters.
3. IF any validation fails, THEN THE System SHALL return HTTP 422 with field-level error messages.
4. WHEN a Customer uploads a new avatar image, THE System SHALL accept JPEG and PNG files up to
   5 MB, store the file, and update the avatar_url in the profiles table.
5. THE System SHALL display the Customer's booking history count and total spend on the profile page.

#### Correctness Properties

- **Property 17.A — Profile Update Round-Trip**: For any valid profile update payload, retrieving
  the profile after the update must return the updated values for all changed fields.

---

### Requirement 18: Customer — Subscription / Membership Plans

**User Story:** As a Customer who books services regularly, I want to purchase a subscription plan
that gives me a fixed number of sessions per month at a discounted rate, so that I save money on
recurring bookings.

#### Acceptance Criteria

1. THE System SHALL define subscription plans with: name, price_per_month, sessions_per_month,
   discount_percent, and is_active fields.
2. WHEN a Customer purchases a subscription plan, THE System SHALL create a subscription record
   with status `ACTIVE`, sessions_remaining = plan.sessions_per_month, and
   renewal_date = today + 30 days.
3. WHILE a Customer has an ACTIVE subscription with sessions_remaining > 0, THE System SHALL apply
   the plan's discount_percent to eligible bookings automatically.
4. WHEN a booking is confirmed for a Customer with an ACTIVE subscription, THE System SHALL
   decrement sessions_remaining by 1.
5. WHEN sessions_remaining reaches 0, THE System SHALL set subscription status to `EXHAUSTED` and
   SHALL NOT apply further discounts until renewal.
6. WHEN renewal_date is reached and the Customer has auto-renewal enabled, THE System SHALL charge
   the Customer's saved payment method and reset sessions_remaining to plan.sessions_per_month.
7. WHEN a Customer cancels a subscription, THE System SHALL set status to `CANCELLED` and SHALL
   allow the Customer to use remaining sessions until the current period ends.

#### Correctness Properties

- **Property 18.A — Session Decrement Invariant**: For any Customer C with subscription S, after
  N confirmed bookings using the subscription: S.sessions_remaining ==
  S.initial_sessions_per_month - N (where N <= initial_sessions_per_month).
- **Property 18.B — Exhausted Subscription No Discount**: For any subscription with
  sessions_remaining == 0, the System must not apply a subscription discount to any booking.

---

### Requirement 19: Customer — Post-Service Review Flow

**User Story:** As a Customer, I want to be prompted to rate and review my Provider after a
service is completed, so that I can share feedback and help other Customers choose well.

#### Acceptance Criteria

1. WHEN a booking status changes to `COMPLETED`, THE Notification_Service SHALL send the Customer
   a push notification and in-app prompt to leave a review within 24 hours.
2. THE review submission form SHALL require a rating (integer 1–5) and allow an optional comment
   (up to 500 characters).
3. WHEN a Customer submits a review, THE System SHALL validate: rating is an integer in [1, 5],
   the booking exists, the booking status is COMPLETED, the Customer is the booking's customer_id,
   and no review already exists for this booking_id.
4. IF any validation fails, THEN THE System SHALL return HTTP 422 with a specific error code.
5. WHEN a review is successfully saved, THE Review_Aggregator SHALL recalculate the Provider's
   avg_rating as the arithmetic mean of all non-flagged ratings and update providers.avg_rating
   and providers.review_count.
6. THE System SHALL allow a Provider to submit a single reply to a review; subsequent reply
   attempts on the same review SHALL return HTTP 409.

#### Correctness Properties

- **Property 19.A — Rating Range Enforcement**: For any review submission with rating R, if R < 1
  or R > 5 or R is not an integer, the System must return HTTP 422.
- **Property 19.B — Average Rating Correctness**: For any Provider P with reviews R1…Rn (all
  non-flagged), P.avg_rating == sum(Ri.rating for i in 1..n) / n, rounded to 2 decimal places.
- **Property 19.C — One Review Per Booking**: For any booking_id, the reviews table must contain
  at most one row with that booking_id.


---

### Requirement 20: Real-Time — Provider GPS Tracking

**User Story:** As a Customer with a confirmed booking, I want to see my Provider's live location
on a map, so that I know when they will arrive.

#### Acceptance Criteria

1. WHEN a booking status changes to `CONFIRMED`, THE System SHALL activate a real-time tracking
   session for that booking, accessible to the Customer via a live map view.
2. WHILE a booking is in status `CONFIRMED` or `IN_PROGRESS`, THE Provider app SHALL send GPS
   coordinates to the System every 10 seconds via WebSocket.
3. THE System SHALL broadcast the Provider's latest coordinates to the Customer's WebSocket
   connection within 2 seconds of receiving them.
4. THE Customer's booking detail page SHALL display the Provider's location on a map with an
   estimated time of arrival (ETA) calculated from the Provider's current coordinates to the
   booking address.
5. WHEN a booking status changes to `COMPLETED` or `CANCELLED`, THE System SHALL close the
   tracking WebSocket session and stop broadcasting coordinates.
6. IF the Provider's WebSocket connection drops, THEN THE System SHALL display a "Location
   unavailable" indicator to the Customer and SHALL attempt to reconnect every 30 seconds.

---

### Requirement 21: Real-Time — Push Notifications and SMS

**User Story:** As a Customer or Provider, I want to receive timely notifications about booking
status changes, so that I am always informed without needing to check the app.

#### Acceptance Criteria

1. THE Notification_Service SHALL send notifications for the following events:
   - Customer: booking confirmed, provider en route, service started, service completed, review prompt.
   - Provider: new booking assigned, booking cancelled, KYC approved/rejected, payout processed.
   - Admin: new KYC submission, payout request.
2. WHEN a notification event occurs, THE Notification_Service SHALL attempt delivery via push
   notification (FCM/APNs) first; IF the push delivery fails, THE System SHALL fall back to SMS.
3. THE System SHALL store all notification records with: user_id, event_type, channel (PUSH/SMS),
   status (SENT/FAILED), and created_at.
4. THE System SHALL allow users to manage notification preferences (enable/disable per event type).
5. THE Notification_Service SHALL not send duplicate notifications for the same event; IF an event
   triggers a notification and the same event fires again within 60 seconds, THE System SHALL
   suppress the duplicate.

---

### Requirement 22: Real-Time — In-App Chat

**User Story:** As a Customer or Provider, I want to send text messages within a booking, so that
I can coordinate arrival details without sharing personal phone numbers.

#### Acceptance Criteria

1. THE Chat_Service SHALL provide a messaging channel scoped to each booking; only the Customer
   and Provider assigned to that booking SHALL be able to send and receive messages in that channel.
2. WHEN a user sends a message, THE Chat_Service SHALL persist the message with: booking_id,
   sender_id, content (up to 1000 characters), and created_at.
3. THE Chat_Service SHALL deliver messages to the recipient via WebSocket in real time; IF the
   recipient is offline, THE System SHALL queue the message and deliver it when the recipient
   reconnects.
4. THE System SHALL load the last 50 messages when a user opens the chat view, ordered by
   created_at ascending.
5. THE Chat_Service SHALL close the messaging channel when the booking reaches status `COMPLETED`
   or `CANCELLED`; subsequent message attempts SHALL return HTTP 403.
6. THE Sanitizer SHALL strip HTML and script content from all chat messages before persistence.

#### Correctness Properties

- **Property 22.A — Message Ordering Invariant**: For any booking B, retrieving messages for B
  must return them in ascending created_at order. For any two messages M1 and M2 where M1 was
  sent before M2, M1.created_at <= M2.created_at in the response.
- **Property 22.B — Message Count Invariant**: For any booking B, after sending N messages, the
  message count for B must equal the previous count + N.

---

### Requirement 23: Search — Keyword and City Search

**User Story:** As a Customer, I want to search for services by keyword and filter by city, so
that I can quickly find what I need.

#### Acceptance Criteria

1. THE Search_Engine SHALL expose a `/search` endpoint accepting `q` (keyword) and `city`
   (optional) query parameters.
2. WHEN a search query is submitted, THE Search_Engine SHALL return matching categories (by name
   or description) and matching Providers (by name, bio, or category name) where is_active/is_verified
   is true.
3. THE Search_Engine SHALL return results ranked by relevance: exact name matches first, then
   partial matches, then bio/description matches.
4. WHEN `city` is provided, THE Search_Engine SHALL restrict Provider results to the specified city.
5. THE homepage search bar SHALL call the `/search` endpoint on submit and navigate to a search
   results page displaying matching categories and providers.
6. IF the search query is empty or fewer than 2 characters, THE System SHALL return HTTP 400 with
   error code `QUERY_TOO_SHORT`.

#### Correctness Properties

- **Property 23.A — City Filter in Search**: For any search with city=C, all Provider results
  must have profile.city == C.
- **Property 23.B — Relevance Subset**: For any query Q2 that is a strict extension of Q1 (i.e.,
  Q2 == Q1 + more characters), the result set for Q2 must be a subset of the result set for Q1.
  (Metamorphic: more specific queries return fewer or equal results.)


---

### Requirement 24: Service Catalogue — Packages and Add-Ons

**User Story:** As a Customer, I want to choose from different service packages (e.g., "1-hour
regular clean" vs "3-hour deep clean") and optional add-ons, so that I can tailor the service
to my needs.

#### Acceptance Criteria

1. THE System SHALL support service packages per category: each package has a name, description,
   duration_minutes, and price.
2. THE System SHALL support add-ons per category: each add-on has a name, description, and
   additional_price.
3. WHEN a Customer selects a category in the booking flow, THE System SHALL display available
   packages and add-ons for that category.
4. WHEN a Customer selects a package and zero or more add-ons, THE System SHALL calculate
   total_amount = package.price + sum(selected_addon.additional_price).
5. THE booking record SHALL store the selected package_id and a JSON array of selected addon_ids.
6. THE Provider's booking detail view SHALL display the selected package and add-ons so the
   Provider knows the scope of work.

#### Correctness Properties

- **Property 24.A — Price Calculation Correctness**: For any booking with package P and add-ons
  A1…An, total_amount == P.price + sum(Ai.additional_price for i in 1..n). (Property-based:
  generate random package and add-on combinations, verify the formula holds for all inputs.)

---

### Requirement 25: Admin — Coupon Management UI

**User Story:** As an Admin, I want to create, edit, and deactivate coupons from the admin
dashboard, so that I can run promotions without touching the database directly.

#### Acceptance Criteria

1. THE Admin dashboard coupons tab SHALL display a "Create coupon" button that opens a form with
   fields: code, type (FLAT/PERCENT), value, max_uses (optional), expires_at (optional).
2. WHEN an Admin submits the create coupon form, THE System SHALL validate: code is alphanumeric
   and 3–20 characters, value > 0, PERCENT value <= 100, expires_at is in the future if provided.
3. IF validation fails, THE System SHALL display field-level error messages in the form.
4. WHEN a valid coupon is submitted, THE System SHALL create the coupon record and display it in
   the coupons table.
5. THE Admin SHALL be able to toggle a coupon's is_active status from the coupons table.
6. THE Admin SHALL be able to edit the max_uses and expires_at of an existing coupon.

---

### Requirement 26: Admin — Document Review UI

**User Story:** As an Admin, I want to view and approve or reject Provider KYC documents from
the admin dashboard, so that I can verify Providers without accessing the database.

#### Acceptance Criteria

1. THE Admin KYC queue SHALL display each pending Provider's submitted documents (Aadhaar, PAN,
   Bank) with a link to view the document file.
2. WHEN an Admin clicks "Approve" on a document, THE System SHALL update the document status to
   `APPROVED` and, if all required documents are approved, set the Provider's is_verified to true.
3. WHEN an Admin clicks "Reject" on a document, THE System SHALL prompt for a rejection reason,
   update the document status to `REJECTED`, and notify the Provider via SMS with the reason.
4. THE Admin dashboard SHALL display the count of documents pending review as a badge on the
   KYC Queue tab.
5. THE Admin SHALL be able to filter the KYC queue by document type and status.

---

### Requirement 27: Admin — Payout Management UI

**User Story:** As an Admin, I want to review and approve Provider payout requests from the
dashboard, so that I can manage disbursements efficiently.

#### Acceptance Criteria

1. THE Admin dashboard SHALL include a "Payouts" tab displaying all payout requests with status
   `REQUESTED`, showing: Provider name, amount, bank details, and request date.
2. WHEN an Admin approves a payout, THE System SHALL update the payout status to `PROCESSING`
   and initiate the bank transfer.
3. WHEN an Admin rejects a payout, THE System SHALL update the payout status to `REJECTED`,
   restore the amount to the Provider's available_balance, and notify the Provider.
4. THE Admin SHALL be able to filter payouts by status (REQUESTED, PROCESSING, PAID, FAILED,
   REJECTED).
5. THE Admin dashboard SHALL display total payout volume (sum of PAID payouts) for the current
   month.

---

### Requirement 28: Admin — All Providers View (Bug Fix)

**User Story:** As an Admin, I want the "Providers" tab to show all registered Providers (not
just unverified ones), so that I can manage the full provider roster.

#### Acceptance Criteria

1. THE Admin "Providers" tab SHALL fetch providers from a dedicated `/admin/providers` endpoint
   that returns all Providers regardless of verification status.
2. THE `/admin/providers` endpoint SHALL return: id, name, city, is_verified, avg_rating,
   review_count, hourly_rate, status, and created_at for each Provider.
3. THE Admin SHALL be able to filter the providers list by: is_verified (true/false/all),
   city, and status (ONLINE/OFFLINE/BUSY).
4. THE Admin SHALL be able to search providers by name.
5. THE Admin SHALL be able to click a Provider to view their full profile, documents, and
   booking history.


---

### Requirement 29: Bug Fix — Provider Profile "Book Now" Multi-Category

**User Story:** As a Customer viewing a Provider's profile, I want to book any of the Provider's
offered services, so that I am not limited to only the first category.

#### Acceptance Criteria

1. THE Provider profile page SHALL display all categories the Provider offers, each with its
   custom price.
2. WHEN a Provider offers more than one category, THE System SHALL display a service selector
   (dropdown or card list) before the "Book now" button.
3. WHEN a Customer clicks "Book now" for a specific category, THE System SHALL navigate to the
   booking flow pre-populated with that category_id and the selected Provider.
4. THE "Book now" button SHALL NOT default to the first category_id when the Provider offers
   multiple services.

---

### Requirement 30: Bug Fix — Missing useRouter Import in Root Layout

**User Story:** As a developer, I want the application to compile without import errors, so that
the error boundary in the root layout functions correctly.

#### Acceptance Criteria

1. THE `__root.tsx` file SHALL import `useRouter` from `@tanstack/react-router` before using it
   in the `ErrorComponent`.
2. THE application SHALL compile without TypeScript or ESLint errors related to undefined
   `useRouter` in the root layout.
3. THE error boundary SHALL correctly display the error message and a "Reload" button when an
   unhandled error occurs.

---

### Requirement 31: Bug Fix — profile_contacts Phone Join

**User Story:** As an Admin or Customer, I want phone numbers to appear in provider and user
listings, so that contact information is complete.

#### Acceptance Criteria

1. THE `/providers` list query SHALL LEFT JOIN `profile_contacts` on `profile_contacts.user_id =
   p.id` and include `profile_contacts.phone` in the response.
2. THE `/admin/users` query SHALL include the phone number from `profile_contacts` for each user.
3. THE Provider profile API response SHALL include the Provider's phone number (masked to last
   4 digits for Customer-facing views, full number for Admin views).

---

### Requirement 32: Non-Functional — Performance and Scalability

**User Story:** As a Customer, I want the platform to respond quickly even during peak hours, so
that I can book services without frustrating delays.

#### Acceptance Criteria

1. THE System SHALL respond to all read API endpoints (categories, providers list, booking list)
   within 500 ms at the 95th percentile under a load of 100 concurrent users.
2. THE Dispatcher SHALL complete provider matching and booking creation within 5 seconds under
   normal load.
3. THE System SHALL use database connection pooling with a minimum pool size of 5 and maximum of
   50 connections.
4. THE System SHALL cache the categories list in memory for 60 seconds to reduce database load.
5. THE System SHALL paginate all list endpoints (providers, bookings, admin users) with a default
   page size of 20 and a maximum of 100.

---

### Requirement 33: Non-Functional — Observability and Error Handling

**User Story:** As a platform operator, I want all errors and key events to be logged with
sufficient context, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. THE System SHALL log all unhandled errors with: timestamp, request path, HTTP method, error
   message, and stack trace.
2. THE System SHALL log all booking lifecycle events (created, confirmed, completed, cancelled)
   with booking_id, customer_id, provider_id, and timestamp.
3. THE System SHALL return structured JSON error responses for all 4xx and 5xx responses with
   fields: `error` (machine-readable code) and `message` (human-readable description).
4. THE System SHALL never expose stack traces or internal error details in API responses sent to
   clients.
5. THE System SHALL emit a health check endpoint at `/api/v1/health` that returns HTTP 200 with
   database connectivity status.

---

### Requirement 34: Non-Functional — Data Integrity

**User Story:** As a platform operator, I want all financial and booking data to be consistent,
so that earnings, payments, and bookings are never in a contradictory state.

#### Acceptance Criteria

1. THE System SHALL wrap all multi-table writes (booking creation + payment creation, booking
   completion + wallet update, coupon use + booking confirmation) in database transactions with
   ACID guarantees.
2. IF any step within a transaction fails, THE System SHALL roll back all changes in that
   transaction and return an appropriate error to the client.
3. THE System SHALL enforce foreign key constraints on all tables as defined in the schema.
4. THE System SHALL use optimistic locking or SELECT FOR UPDATE on wallet balance updates to
   prevent race conditions when multiple bookings complete simultaneously for the same Provider.

#### Correctness Properties

- **Property 34.A — Transaction Atomicity**: For any multi-step operation (e.g., confirm booking
  + update wallet), either all steps succeed or none do. (Property-based: simulate failures at
  each step and verify the database is left in a consistent state with no partial writes.)

