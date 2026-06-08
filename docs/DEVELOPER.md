# HomeHero — Developer Guide

This document explains the entire codebase: how it is structured, why each part exists, how the key flows work end-to-end, and exactly where to touch things when you need to add or change a feature.

---

## Table of Contents

1. [What is HomeHero?](#1-what-is-homehero)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [Running Locally](#4-running-locally)
5. [Environment Variables](#5-environment-variables)
6. [Backend Architecture](#6-backend-architecture)
   - 6.1 [Monolith vs Microservices](#61-monolith-vs-microservices)
   - 6.2 [API Gateway](#62-api-gateway)
   - 6.3 [Request Lifecycle](#63-request-lifecycle)
   - 6.4 [Auth — JWT + Refresh Tokens](#64-auth--jwt--refresh-tokens)
   - 6.5 [Database Layer — Models](#65-database-layer--models)
   - 6.6 [Routes → Controllers](#66-routes--controllers)
   - 6.7 [Middleware Stack](#67-middleware-stack)
   - 6.8 [Providers — Mock → Real](#68-providers--mock--real)
   - 6.9 [Booking Dispatch Service](#69-booking-dispatch-service)
   - 6.10 [Realtime — Socket.IO](#610-realtime--socketio)
   - 6.11 [Response Caching](#611-response-caching)
   - 6.12 [File Uploads](#612-file-uploads)
7. [Database Schema](#7-database-schema)
   - 7.1 [Core Tables](#71-core-tables)
   - 7.2 [Booking Status Flow](#72-booking-status-flow)
   - 7.3 [Payment Status Flow](#73-payment-status-flow)
8. [Frontend Architecture](#8-frontend-architecture)
   - 8.1 [Routing — TanStack Router](#81-routing--tanstack-router)
   - 8.2 [Data Fetching — TanStack Query](#82-data-fetching--tanstack-query)
   - 8.3 [Auth Context](#83-auth-context)
   - 8.4 [API Client — lib/api.ts](#84-api-client--libapits)
   - 8.5 [Socket Client](#85-socket-client)
   - 8.6 [Pages Reference](#86-pages-reference)
9. [Key End-to-End Flows](#9-key-end-to-end-flows)
   - 9.1 [Customer Books a Service](#91-customer-books-a-service)
   - 9.2 [Payment — Cash / Wallet / Online](#92-payment--cash--wallet--online)
   - 9.3 [Expert Signup + KYC](#93-expert-signup--kyc)
   - 9.4 [Live Booking Tracking](#94-live-booking-tracking)
10. [Admin Panel](#10-admin-panel)
11. [Adding a New Feature — Checklist](#11-adding-a-new-feature--checklist)
12. [Going to Production](#12-going-to-production)
13. [External Services Reference](#13-external-services-reference)

---

## 1. What is HomeHero?

An on-demand household services marketplace. Customers book trained, background-verified household helpers ("Experts") for tasks like cleaning, dishwashing, laundry, and cooking. Experts are matched in real time and tracked live on a map.

**Three user roles:**

| Role | Can do |
|---|---|
| `CUSTOMER` | Browse services, book, track, review, manage wallet |
| `EXPERT` | Accept jobs, advance booking status, manage earnings/withdrawals, upload KYC docs |
| `ADMIN` / `SUPER_ADMIN` | Full CMS, user management, KYC review, coupon management, support, analytics |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TanStack Start (SSR), TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui |
| Backend | Node.js 20+ ESM, Express.js |
| Database | MySQL 8 via Prisma ORM (v5) + mysql2 driver |
| Realtime | Socket.IO (+ Redis adapter for multi-instance) |
| Queue | BullMQ + Redis (falls back to in-process `setTimeout`) |
| Auth | JWT access token (15 min) + opaque refresh token (30 days, stored in DB) |
| Payments | Razorpay (auto-mocked when keys are absent) |
| File storage | Local disk `backend/uploads/` in dev; swap `storageProvider.js` for S3 in prod |
| SMS OTP | MSG91 (primary) / Twilio (fallback) — both auto-mocked when keys absent |
| Push | Firebase Cloud Messaging — auto-mocked when key absent |
| Caching | Redis (shared) or in-memory Map with TTL |

---

## 3. Repository Layout

```
homehero-spark/
├── backend/
│   ├── server/                   ← The monolith (port 4001)
│   │   ├── api.js                ← Express app entry: middleware + route mounting
│   │   ├── prisma.js             ← Prisma client singleton (shared across the app)
│   │   ├── migrate.js            ← Redirect stub — use `npm run db:migrate` instead
│   │   ├── seed.js               ← Demo data seed (run once after migrate)
│   │   ├── auth/
│   │   │   └── tokens.js         ← JWT sign/verify + refresh token helpers
│   │   ├── controllers/          ← Request handlers (one file per domain)
│   │   ├── middleware/           ← auth, cors, rateLimit, cache, sanitize, errorHandler
│   │   ├── models/               ← DB query functions (Prisma ORM + $queryRaw for joins)
│   │   ├── providers/            ← External service adapters (payment, sms, storage, fcm)
│   │   ├── queues/               ← dispatchQueue.js (BullMQ or in-process setTimeout)
│   │   ├── realtime/             ← io.js — Socket.IO server + room management
│   │   ├── routes/               ← Express routers (one file per domain)
│   │   └── services/             ← Business logic: dispatchService, notificationService, auditService
│   ├── services/                 ← Optional microservices (thin proxies; gateway routes to these)
│   │   ├── gateway/              ← API gateway (port 4000)
│   │   ├── auth-service/         ← Standalone auth (port 4101)
│   │   ├── payment-service/      ← Standalone payment (port 4102)
│   │   └── booking-service/      ← Standalone booking (port 4103)
│   ├── prisma/
│   │   └── schema.prisma         ← Prisma schema — all tables, enums, and column types
│   └── scripts/
│       └── load-test.js          ← k6 load test (requires k6 installed)
│
├── frontend/
│   └── src/
│       ├── routes/               ← Every file = one page (TanStack file-based routing)
│       ├── components/
│       │   ├── layout/           ← Navbar, Footer, NotificationBell
│       │   ├── home/             ← BannerSlider (hero carousel)
│       │   ├── booking/          ← BookingTracker, LiveMap
│       │   ├── expert/           ← ExpertCard
│       │   ├── shared/           ← Avatar, EmptyState, LoadingSpinner, StarRating, StatusBadge
│       │   └── ui/               ← shadcn/ui primitives (Button, Input, Dialog, etc.)
│       ├── lib/
│       │   ├── api.ts            ← fetch wrapper, token management, uploadFile()
│       │   ├── auth-context.tsx  ← React context that parses the JWT from localStorage
│       │   ├── socket.ts         ← Lazy Socket.IO client singleton
│       │   ├── icons.ts          ← serviceIcon() maps icon_name strings to Lucide icons
│       │   └── utils.ts          ← cn() Tailwind class merge helper
│       └── styles.css            ← Tailwind base + CSS design tokens (colors, radius)
│
└── docs/
    ├── DEVELOPER.md              ← This file
    ├── DEPLOYMENT.md             ← Production deployment guide
    ├── ADMIN_GUIDE.md            ← How to use the admin panel
    └── STATUS.md                 ← Current feature status and known gaps
```

---

## 4. Running Locally

### Prerequisites
- Node.js 20+
- MySQL 8 running locally (or via Docker)
- Redis 7 (optional — needed for BullMQ, multi-instance Socket.IO, and shared caching)

### Steps

```bash
# 1. Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL=mysql://user:pass@127.0.0.1:3306/homehero

# 3. Create the DB and apply schema
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS homehero"
cd backend && npm run db:migrate && cd ..

# 4. Seed demo data (services, cities, demo accounts)
node backend/server/seed.js

# 5. Start everything
# Option A — from repo root:
npm run dev
# Option B — manually:
node backend/server/api.js &
cd frontend && npm run dev
```

**Demo accounts (password: `Demo@1234`):**
| Role | Email |
|---|---|
| Customer | `customer@homehero.test` |
| Expert | `e1@snabbit.test` through `e5@snabbit.test` |
| Admin | `admin@homehero.test` |
| Super Admin | `superadmin@homehero.test` |

### Restarting services safely

`pkill -f "server/api.js"` will kill itself — the pattern matches the shell command's own argument list. Always restart by PID:

```bash
# Find the PID listening on port 4001 and kill it cleanly
kill $(lsof -ti tcp:4001 -sTCP:LISTEN)

# Restart in background
nohup node backend/server/api.js > /tmp/monolith.log 2>&1 & disown
```

---

## 5. Environment Variables

All variables live in `backend/.env`. The app runs without most of them — providers fall back silently to mock mode.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | _(required)_ | Full Prisma connection string: `mysql://user:pass@127.0.0.1:3306/homehero` |
| `JWT_SECRET` | `dev-secret` | **Must be 32+ random chars in production.** Generate: `openssl rand -hex 32` |
| `API_PORT` | `4001` | Monolith port |
| `GATEWAY_PORT` | `4000` | Gateway port (only needed if running the gateway) |
| `ALLOWED_ORIGINS` | `http://localhost:8080` | CORS — set to your frontend domain(s) in prod |
| `NODE_ENV` | _(unset)_ | Set to `production` to enforce JWT strength + strict CORS |
| `REDIS_URL` | _(unset)_ | Enables BullMQ, Socket.IO Redis adapter, shared caching |
| `RAZORPAY_KEY_ID` | _(unset)_ | Razorpay live/test key — payment mocked without this |
| `RAZORPAY_KEY_SECRET` | _(unset)_ | Required together with `KEY_ID` |
| `MSG91_AUTH_KEY` | _(unset)_ | SMS OTP — mocked (console.log) without this |
| `FIREBASE_SERVICE_ACCOUNT` | _(unset)_ | Push notifications — mocked without this |
| `PUBLIC_BACKEND_URL` | _(unset)_ | Base URL for uploaded file links. Set to `https://api.yourdomain.com` in prod |
| `TRUST_PROXY` | `1` | Proxy hops to trust for real client IP (rate limiting) |
| `RATE_LIMIT_API` | `300` | Requests/minute/IP across the whole API |
| `RATE_LIMIT_AUTH` | `20` | Login/signup attempts per 15 min/IP |
| `RATE_LIMIT_OTP` | `5` | OTP requests per 15 min per IP+phone composite key |
| `JSON_BODY_LIMIT` | `1mb` | Max request body size |

---

## 6. Backend Architecture

### 6.1 Monolith vs Microservices

In development, **only the monolith (port 4001) needs to run** — it handles everything including auth, payments, bookings, realtime, and file uploads.

The gateway and microservices are optional and designed for incremental production extraction. The microservice files (`services/auth-service/server.js` etc.) simply import the same route files from the monolith, so they always stay in sync without code duplication.

```
Development:
  Frontend :8080  →  Monolith :4001

Production option (with gateway):
  Frontend  →  Gateway :4000
                ├── /api/v1/auth, /me              → auth-service :4101
                ├── /api/v1/payments, /wallet       → payment-service :4102
                ├── /api/v1/bookings, /reviews      → booking-service :4103
                └── everything else + WebSocket    → monolith :4001
```

### 6.2 API Gateway

File: `backend/services/gateway/server.js`

- Adds `helmet()` and sets `trust proxy` at the public edge
- Each route in the `ROUTES` array is proxied with `xfwd: true` — this forwards `X-Forwarded-For` so downstream services see the real client IP (needed for per-IP rate limiting to work correctly)
- The fallback proxy passes WebSocket upgrades (`ws: true`), keeping Socket.IO working through the gateway

### 6.3 Request Lifecycle

Every HTTP request through the monolith passes this middleware chain in order:

```
1.  helmet()            → 15+ security response headers (CSP, HSTS, X-Frame-Options…)
2.  compression()       → gzip / brotli compression (negotiated via Accept-Encoding)
3.  corsMiddleware      → validates Origin against ALLOWED_ORIGINS; blocks in production
4.  express.json()      → parse JSON body (1MB limit)
5.  sanitizeBody        → recursively strips HTML tags from all string values (XSS guard)
                         ↓
6.  GET /health         → exits here (exempt from rate limiting — for load-balancer probes)
7.  GET /uploads/*      → static file server for local KYC uploads
                         ↓
8.  apiLimiter          → 300 req/min/IP rate limit applied to entire /api/v1 tree
                         ↓
9.  route handlers      → authMiddleware → controller → model → DB response
                         ↓
10. errorHandler        → catches any thrown error, formats as { error, message } JSON
```

### 6.4 Auth — JWT + Refresh Tokens

**Access token** — JWT signed with `JWT_SECRET`. Expires in 15 minutes. Payload: `{ user_id, email, role }`.

**Refresh token** — Random 96-character hex string (deliberately NOT a JWT, so it can never be used as an access token). Stored as `SHA-256(token)` in the `refresh_tokens` table. Expires after 30 days.

**Login flow:**
```
POST /auth/login  →  { accessToken, refreshToken }

Every API call:
  Authorization: Bearer <accessToken>
  → authMiddleware verifies JWT → sets req.user = { id, email, role }

When access token expires (server returns 401):
  POST /auth/refresh  { refresh_token }
  → server: verifies hash matches DB, token not expired
  → rotates to a new pair (old refresh token deleted)
  → returns { accessToken, refreshToken }
```

**Frontend storage:** `localStorage` keys `homehero_token` and `homehero_refresh`. A custom `homehero-auth-changed` window event tells `AuthContext` to re-parse the token whenever `setTokens()` or `clearTokens()` is called (from `lib/api.ts`).

**Key files:**
- `backend/server/auth/tokens.js` — sign / generate / hash helpers
- `backend/server/middleware/auth.js` — `authMiddleware`, `requireRole()`, `isAdmin()`
- `backend/server/routes/auth.js` — all auth endpoints
- `frontend/src/lib/api.ts` — transparent 401 retry with token refresh
- `frontend/src/lib/auth-context.tsx` — React auth state

### 6.5 Database Layer — Models

Every model file in `backend/server/models/` exports an object of async functions backed by **Prisma ORM v5**. The shared Prisma client is the singleton exported from `prisma.js`. Simple CRUD uses Prisma's typed API; complex multi-table JOINs use `prisma.$queryRaw` with `Prisma.sql` tagged template literals (SQL-injection-safe parameterised queries).

```js
// Standard pattern
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';

export const ExampleModel = {
  async findById(id) {
    return prisma.example.findUnique({ where: { id } });
  },

  // The optional `tx` parameter lets callers inject a transaction client
  async create(data, tx = prisma) {
    return tx.example.create({ data });
  },

  // Multi-table JOIN — use $queryRaw with Prisma.sql for safe parameterisation
  async findWithDetails(id) {
    const rows = await prisma.$queryRaw`
      SELECT e.*, o.name AS owner_name
      FROM example e LEFT JOIN owners o ON o.id = e.owner_id
      WHERE e.id = ${id}
    `;
    return rows[0] ?? null;
  },
};
```

**Dynamic WHERE clauses** — build `Prisma.sql` fragment arrays and join them:

```js
const filters = [];
if (q) filters.push(Prisma.sql`name LIKE ${`%${q}%`}`);
const where = filters.length
  ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
  : Prisma.empty;
const rows = await prisma.$queryRaw`SELECT * FROM example ${where}`;
```

**Transactions** — use `prisma.$transaction(async (tx) => { ... })` and pass `tx` into every model method inside the callback. The booking-with-wallet-debit in `bookingController.js` is the canonical example to copy.

```js
const bookingId = await prisma.$transaction(async (tx) => {
  const id = await BookingModel.create(payload, tx);
  await WalletModel.debitWithConn(tx, userId, amount, id, description);
  return id;
});
```

**Schema management** — the Prisma schema lives in `backend/prisma/schema.prisma`. Apply changes with `npm run db:migrate` (runs `prisma db push`) from the `backend/` directory.

### 6.6 Routes → Controllers

Each domain has a matching route file and controller:

| Route file | Controller |
|---|---|
| `routes/auth.js` | `controllers/authController.js` |
| `routes/bookings.js` | `controllers/bookingController.js` |
| `routes/experts.js` | `controllers/expertController.js` |
| `routes/payments.js` | `controllers/paymentController.js` |
| `routes/services.js` | `controllers/serviceController.js` |
| `routes/wallet.js` + `routes/customerWallet.js` | `controllers/walletController.js` |
| `routes/cms.js` | `controllers/cmsController.js` |
| `routes/admin.js` | `controllers/adminController.js` |
| `routes/uploads.js` | _(inline — no separate controller)_ |

All controller methods are async. Errors are thrown using helpers from `errors.js`:

```js
import { BadRequest, NotFound, Forbidden } from '../errors.js';

throw BadRequest('COUPON_EXPIRED', 'This coupon has expired.');
throw NotFound('Booking not found.');
throw Forbidden();   // → 403
```

`errorHandler` (last middleware in `api.js`) catches these and returns `{ error: 'CODE', message: '...' }` with the correct HTTP status code.

`asyncHandler(fn)` (from `utils.js`) wraps any async route handler so uncaught promise rejections are forwarded to `errorHandler` without needing a try/catch in every route.

### 6.7 Middleware Stack

| File | What it does |
|---|---|
| `middleware/auth.js` | `authMiddleware` — verifies Bearer JWT, sets `req.user`. `requireRole(...roles)` — role guard for specific endpoints. `isAdmin(user)` — true for ADMIN or SUPER_ADMIN. |
| `middleware/rateLimit.js` | `apiLimiter` (300/min/IP), `authLimiter` (20/15min/IP), `otpLimiter` (5/15min, keyed by IP+phone). |
| `middleware/cors.js` | Reads `ALLOWED_ORIGINS`; blocks unrecognised origins in production. |
| `middleware/sanitize.js` | Strips HTML tags recursively from all string values in `req.body`. |
| `middleware/cache.js` | `cacheMiddleware(ttlSeconds)` — caches GET response bodies. `bustCache(prefix)` — invalidates by prefix. |
| `middleware/errorHandler.js` | Final error handler — normalises all errors to `{ error, message }` JSON with correct HTTP status. |

### 6.8 Providers — Mock → Real

Every external service lives in a provider file that checks for credentials at startup and silently falls back to a mock. **No application code changes are needed to go live — just set the relevant env vars.**

| Provider | Real when | Mock behaviour |
|---|---|---|
| `providers/paymentProvider.js` | `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` set | Returns `order_mock_xxx` ID; `verifySignature` accepts `"mock_signature"` |
| `providers/smsProvider.js` | `MSG91_AUTH_KEY` or `TWILIO_*` set | Logs the OTP to `console.log` |
| `providers/storageProvider.js` | `AWS_S3_BUCKET` set *(not yet wired in uploads.js)* | Saves to `backend/uploads/`, returns localhost URL |
| `providers/fcmProvider.js` | `FIREBASE_SERVICE_ACCOUNT` set | Logs the notification to `console.log` |

### 6.9 Booking Dispatch Service

File: `backend/server/services/dispatchService.js`

When a booking is created, the system immediately tries to find the best available expert:

1. `ExpertModel.findCandidatesForService(serviceId)` — fetches all `ONLINE`, non-busy experts who offer the booked service.
2. Each candidate gets a **distance** (Haversine great-circle km from booking address to expert's last known location).
3. Filters out experts further than `DISPATCH_RADIUS_KM` (default: 15 km) — but only when location data is available for both sides.
4. Sorts remaining candidates: **nearest first → highest rating → lowest active job load**.
5. **Match found:** assigns immediately, marks expert `BUSY`, emits `booking_assigned` Socket.IO event to the booking room, sends push notification to both customer and expert.
6. **No match:** booking stays `SEARCHING`. A retry is enqueued after `DISPATCH_RETRY_MS` (default: 8s), up to `DISPATCH_MAX_RETRIES` (default: 5) attempts.

**Queue backend:**
- `REDIS_URL` set → BullMQ (persistent across restarts, shareable across instances)
- `REDIS_URL` not set → in-process `setTimeout` (resets if process dies)

### 6.10 Realtime — Socket.IO

File: `backend/server/realtime/io.js`

Socket.IO shares the same HTTP server and port as Express — no second port needed.

**Authentication:** Every socket connection must supply a valid JWT in `handshake.auth.token`. Connections without a valid token are rejected immediately (before any event handler runs).

**Rooms:**
- `user:<userId>` — every connected user auto-joins this room on connection.
- `booking:<bookingId>` — customer/expert subscribes via `subscribe_booking` event. Server verifies they are a party to that booking before admitting them.

**Events the server emits:**

| Event | Room | Payload | Trigger |
|---|---|---|---|
| `booking_status_updated` | `booking:<id>` | `{ status, message }` | Expert advances booking status |
| `booking_assigned` | `booking:<id>` | `{ status, eta_minutes, expert_id }` | Dispatch finds an expert |
| `expert_location_updated` | `booking:<id>` | `{ lat, lng, at }` | Expert emits GPS |
| `notification` | `user:<id>` | `{ type, title, body }` | Any in-app notification |

**Events the client sends:**

| Event | Sender | Payload |
|---|---|---|
| `subscribe_booking` | Customer or Expert | `bookingId` |
| `expert_location` | Expert | `{ lat, lng }` |

**Multi-instance:** Set `REDIS_URL` to attach the Redis adapter (`@socket.io/redis-adapter`). Without it, a socket on instance A never receives an event emitted from instance B.

### 6.11 Response Caching

File: `backend/server/middleware/cache.js`

Only `GET` requests are cached. The full `req.originalUrl` is the cache key.

- **With Redis:** `SET key value EX ttl` — shared across all instances.
- **Without Redis:** In-memory `Map<key, {body, expiresAt}>` — per-process only.

**Currently cached:**
- `GET /services` and `GET /services/:id` — 120s TTL
- All `GET /cms/*` routes — 120s TTL

**Cache busting:** Service creates/updates call `bustCache(SERVICES_CACHE_PREFIX)`. Add the same pattern whenever you cache a collection that your mutations modify.

Every response includes `X-Cache: HIT` or `X-Cache: MISS` — useful for debugging with `curl -sI`.

### 6.12 File Uploads

File: `backend/server/routes/uploads.js`

`POST /api/v1/uploads` — authenticated. Accepts `multipart/form-data` with a `file` field.

- **Allowed types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- **Max size:** 8 MB
- **Save path:** `backend/uploads/<folder>/<userId>/<uuid>.<ext>`
- **Returns:** `{ file_url, key }` — `file_url` is absolute, built from `PUBLIC_BACKEND_URL` env var or `req.protocol + req.get('host')`

Files are served statically at `/uploads/*` with `Cross-Origin-Resource-Policy: cross-origin` so the frontend (different origin in dev) can load them as `<img src>`.

**Swapping to S3:** Implement `storageProvider.upload(file) → url` and call it from `routes/uploads.js` instead of writing to disk. Remove the `express.static('/uploads')` mount from `api.js`.

---

## 7. Database Schema

File: `backend/server/schema.sql` — all `CREATE TABLE IF NOT EXISTS`, safe to re-run.

### 7.1 Core Tables

| Table | Purpose |
|---|---|
| `users` | Core identity: UUID id, email, bcrypt password_hash |
| `user_roles` | One row per user: role enum (`CUSTOMER`, `EXPERT`, `ADMIN`, `SUPER_ADMIN`) |
| `profiles` | Display info: name, phone, avatar_url, city |
| `experts` | Expert profile: bio, gender, experience_years, avg_rating, current GPS, status (`ONLINE`/`OFFLINE`/`BUSY`), is_verified |
| `expert_services` | Many-to-many: which expert offers which service |
| `expert_documents` | KYC: type (`AADHAAR`/`PAN`/`SELFIE`), file_url, status (`PENDING`/`APPROVED`/`REJECTED`), review_note |
| `services` | Catalogue: name, tagline, rate_per_hour, min_hours, icon_name, image_url, is_active |
| `addresses` | Saved customer addresses with optional lat/lng |
| `bookings` | Central transaction record (see status flow) |
| `booking_events` | Timestamped log of every status change (shown in tracking UI) |
| `payments` | Settlement record per booking: method, amount, status |
| `payment_transactions` | Razorpay order lifecycle: order_id, payment_id, signature, purpose, status |
| `customer_wallets` | Customer wallet: balance, total_added, total_spent |
| `wallet_transactions` | Per-transaction ledger |
| `expert_wallets` | Expert earnings wallet |
| `expert_wallet_transactions` | Per-transaction ledger |
| `withdrawal_requests` | Expert payout requests: amount, status (`REQUESTED`/`APPROVED`/`PAID`/`REJECTED`) |
| `coupons` | Discount codes: type (`FLAT`/`PERCENT`), value, usage limit, expiry |
| `coupon_usages` | Tracks which user used which coupon |
| `reviews` | Customer → expert: rating (1–5), comment |
| `otp_requests` | Phone OTP: code, purpose, expires_at, used flag |
| `refresh_tokens` | Hashed refresh tokens with expiry |
| `notifications` | In-app notification log: type, title, body, read flag |
| `support_tickets` + `support_messages` | Customer support threading |
| `cms_banners` | Hero carousel images with sort_order and is_active |
| `cms_pages` | Slug-based content pages (terms, privacy, refund, etc.) |
| `settings` | Key-value store: some public (served via `/cms/settings`), some admin-only |
| `cities` | City catalogue with is_active flag |
| `audit_log` | Admin action audit trail |

### 7.2 Booking Status Flow

Bookings move forward exactly one step at a time. No skipping, no going backwards.

```
SEARCHING → ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED
    ↑                                                                         ↑
    └──── CANCELLED (allowed from any state except COMPLETED) ───────────────┘
```

| Status | Who sets it | Meaning |
|---|---|---|
| `SEARCHING` | System (on create) | Booking created, dispatch running |
| `ASSIGNED` | Dispatch service | Expert found and matched |
| `ACCEPTED` | Expert | Expert confirmed they're taking the job |
| `ON_THE_WAY` | Expert | Expert started travelling |
| `ARRIVED` | Expert | Expert is at the address |
| `IN_PROGRESS` | Expert | Service has started |
| `COMPLETED` | Expert | Service done; expert wallet credited |
| `CANCELLED` | Customer or Admin | Booking cancelled; wallet refunded if applicable |

The `NEXT_STATUS` map in `bookingController.js` enforces valid transitions server-side.

### 7.3 Payment Status Flow

```
Booking created
  └── payment_status = PENDING

  ├── WALLET: balance debited atomically at create → payment_status = PAID immediately
  │
  ├── CASH:   payment_status = PENDING until expert marks COMPLETED
  │           → PaymentModel created (method: CASH, status: PAID)
  │           → payment_status = PAID
  │
  └── ONLINE: payment_status = PENDING
              → Razorpay order created, returned to frontend
              → Frontend opens checkout modal
              → POST /payments/verify { order_id, payment_id, signature }
              → Backend verifies HMAC signature
              → PaymentModel created (method: CARD, status: PAID)
              → payment_status = PAID
```

---

## 8. Frontend Architecture

### 8.1 Routing — TanStack Router

TanStack Router uses **file-based routing**. Every file in `src/routes/` becomes a URL automatically. The mapping is maintained in `src/routeTree.gen.ts` — this file is auto-generated; never edit it manually.

| Route file | URL | Protected? |
|---|---|---|
| `index.tsx` | `/` | Public |
| `auth.login.tsx` | `/auth/login` | Public |
| `auth.signup-customer.tsx` | `/auth/signup-customer` | Public |
| `auth.signup-expert.tsx` | `/auth/signup-expert` | Public |
| `book.$serviceId.tsx` | `/book/:serviceId` | Soft (prompts login on confirm) |
| `bookings.tsx` | `/bookings` | Auth required |
| `track.$bookingId.tsx` | `/track/:bookingId` | Auth required |
| `expert.index.tsx` | `/expert` | EXPERT role |
| `wallet.tsx` | `/wallet` | Auth required |
| `account.tsx` | `/account` | Auth required |
| `support.tsx` | `/support` | Auth required |
| `admin.index.tsx` | `/admin` | ADMIN / SUPER_ADMIN |
| `terms.tsx` | `/terms` | Public (static) |
| `privacy.tsx` | `/privacy` | Public (static) |
| `refund.tsx` | `/refund` | Public (static) |
| `p.$slug.tsx` | `/p/:slug` | Public (dynamic CMS) |

**To add a new page:** Create `src/routes/your-page.tsx` with `createFileRoute("/your-path")` and export a default component. No registration needed.

### 8.2 Data Fetching — TanStack Query

All server data uses `useQuery` (reads) and `useMutation` (writes). Never use `useState` to store data that comes from the API.

```tsx
// Read
const { data, isLoading } = useQuery({
  queryKey: ["bookings"],                              // unique cache key
  queryFn: () => apiFetch("/bookings"),               // fetch function
  refetchInterval: 8000,                              // optional polling
});

// Write
const qc = useQueryClient();
const create = useMutation({
  mutationFn: (body) => apiFetch("/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }), // trigger refetch
  onError: (e: any) => toast.error(e.message),
});
```

**Cache invalidation rule:** After any mutation that changes data another query displays, call `qc.invalidateQueries` in `onSuccess`.

### 8.3 Auth Context

`src/lib/auth-context.tsx` — provides `useAuth()`:

```ts
{
  user:    { id: string; email: string; role: AppRole } | null,
  token:   string | null,
  role:    AppRole | null,
  loading: boolean,
  signOut: () => Promise<void>
}
```

It reads the JWT from `localStorage` and re-parses it whenever the `homehero-auth-changed` window event fires (dispatched by `setTokens()` / `clearTokens()` in `api.ts`).

**Route guard pattern used in protected pages:**
```tsx
useEffect(() => {
  if (!loading && !user) router.navigate({ to: "/auth/login" });
}, [user, loading, router]);
```

### 8.4 API Client — lib/api.ts

`apiFetch(path, options)` — the only function that talks to the backend.

- Automatically adds `Authorization: Bearer <token>`.
- On `401`: attempts a one-time transparent token refresh (`POST /auth/refresh`), then retries the original request. If refresh fails, calls `clearTokens()`.
- Throws a proper `Error` with the API's `message` field on any non-2xx response.

`uploadFile(file, { folder })` — sends files as `multipart/form-data` to `POST /uploads`. Never sets `Content-Type` manually (browser adds the multipart boundary). Also handles transparent 401 refresh.

`setTokens(access, refresh)` / `clearTokens()` — write/remove tokens and fire `homehero-auth-changed`.

### 8.5 Socket Client

`src/lib/socket.ts` — exports `getSocket()`. Lazily creates one Socket.IO connection authenticated with the current access token. Returns `null` when there's no token, so callers never need to guard against null manually.

```ts
const socket = getSocket();
socket?.emit("subscribe_booking", bookingId, (ack) => {
  console.log(ack.status); // current booking status
});
socket?.on("expert_location_updated", ({ lat, lng }) => {
  // move marker on map
});
```

Call `disconnectSocket()` on logout to close the connection and reset the singleton.

### 8.6 Pages Reference

| Page | Key features |
|---|---|
| `/` | Hero + BannerSlider (CMS banners or built-in slides), services grid, how-it-works, stats, why-us, cities, testimonials, FAQ accordion, app store strip, expert CTA |
| `/book/:serviceId` | Hours/Days duration toggle, instant/scheduled type, saved + new address, coupon input, Cash/Wallet/Online payment, Razorpay checkout for Online |
| `/track/:bookingId` | Live status timeline (booking_events), live map with expert GPS marker via Socket.IO |
| `/expert` | Online/offline toggle, live GPS broadcast (every 10s), job cards with Accept/Advance/Reject, earnings widget, KYC doc upload tiles with status icons |
| `/wallet` | Balance card, quick-amount + custom top-up, Razorpay checkout for top-up, transaction history |
| `/auth/signup-expert` | 3-step animated form: personal info (Zod validation + inline errors) → services grid + experience stepper + gender → KYC doc tiles with preview + live profile card |
| `/admin` | Analytics charts (recharts), expert list + KYC review dialog (image preview + Approve/Reject), booking list, service/coupon/CMS/support/settings management |
| `/terms`, `/privacy`, `/refund` | Static pages with rich legal content — no DB dependency |

---

## 9. Key End-to-End Flows

### 9.1 Customer Books a Service

```
1. GET /services  →  homepage renders service grid

2. Customer selects a service  →  /book/:serviceId

3. Customer fills: duration (hours or days), type (instant/scheduled),
   address (saved or new), optional coupon, payment method

4. "Book now"  →  POST /bookings {
     service_id, duration_hours, booking_type, scheduled_at?,
     address_id or address_snapshot, coupon_code?, payment_method, notes?
   }

5. Backend — bookingController.create():
   a. Validates inputs
   b. Evaluates coupon (CouponModel.evaluate)
   c. If WALLET: checks balance, debits atomically in DB transaction
   d. Creates booking row (status: SEARCHING, payment_status: PENDING/PAID)
   e. dispatchService.findBestExpert() → ranks ONLINE experts by distance/rating/load
   f. Match found:  → assigns, marks expert BUSY, emits booking_assigned socket event
      No match:     → schedules background retry via dispatchQueue
   g. If ONLINE payment: creates Razorpay order, returns gateway_order_id in response

6. Frontend receives { id, status, gateway_order_id?, ... }
   → navigates to /track/:bookingId
   → if ONLINE: opens Razorpay modal, on success calls POST /payments/verify
```

### 9.2 Payment — Cash / Wallet / Online

**Cash** — No upfront charge. `payment_status = PENDING`. When expert marks `COMPLETED`, `bookingController.updateStatus` creates a `PaymentModel` record and sets `payment_status = PAID`.

**Wallet** — Deducted atomically at booking creation (single DB transaction: INSERT booking + UPDATE wallet). `payment_status = PAID` immediately. Refunded via `WalletModel.credit()` on cancellation.

**Online (Razorpay):**
```
booking created  →  backend creates Razorpay order
                    → returns { gateway_order_id, gateway_amount, gateway_key_id, gateway_mock }

If gateway_mock = true (no RAZORPAY keys configured):
  → frontend auto-verifies: POST /payments/verify { order_id, payment_id: "pay_mock", signature: "mock_signature" }
  → payment_status = PAID, navigate to tracking

If gateway_mock = false (real keys):
  → frontend loads checkout.razorpay.com/v1/checkout.js
  → opens Razorpay modal (card / UPI / NetBanking)
  → on success: POST /payments/verify { order_id: resp.razorpay_order_id, payment_id, signature }
  → backend verifies HMAC: SHA256(order_id | payment_id) === signature
  → payment_status = PAID, navigate to tracking
```

### 9.3 Expert Signup + KYC

```
Step 1: Personal info (name, email, phone, city, password, bio)
        → validated client-side with Zod on each field blur + on Continue

Step 2: Services selection + experience (± stepper) + gender
        → must select at least one service to proceed

Step 3: KYC documents (AADHAAR / PAN / SELFIE — all optional at signup)
        → file picker tiles with inline image preview
        → live "profile preview" card showing name, city, experience, selected services

On Submit:
  POST /auth/signup  { ..., role: "EXPERT", service_ids: [...] }
  POST /auth/login   → { accessToken, refreshToken }  (auto-login to upload docs)
  setTokens(access, refresh)
  for each chosen doc:
    POST /uploads?folder=kyc/aadhaar  (multipart)  → { file_url }
    POST /experts/:id/documents        { type, file_url }
  navigate('/expert')

Admin KYC review:
  /admin → Experts section → "Docs" button
  → dialog shows image previews (not raw URLs)
  PATCH /admin/experts/:id/documents/:docId  { status: "APPROVED" | "REJECTED" }
  → once verified: expert.is_verified = true → starts receiving bookings
```

### 9.4 Live Booking Tracking

```
Customer on /track/:bookingId:
  getSocket().emit("subscribe_booking", bookingId, ack)
  → server checks: is user the customer or expert of this booking?
  → joins room booking:<bookingId>
  → ack returns current status + eta

Expert on /expert dashboard (while online):
  every 10 seconds:
    navigator.geolocation.getCurrentPosition(...)
    socket.emit("expert_location", { lat, lng })
  
  → server: ExpertModel.setLocation(expertId, lat, lng)  [persists to DB]
  → server: for each ACTIVE booking of this expert:
      emitToBooking(bookingId, "expert_location_updated", { lat, lng, at })

Customer receives:
  "expert_location_updated"  → moves expert marker on LiveMap component
  "booking_status_updated"   → updates status timeline + badge

Expert advances status:
  PATCH /bookings/:id/status { status: "ON_THE_WAY" }
  → server: BookingModel.updateStatus()
  → server: emitToBooking(id, "booking_status_updated", { status, message })
  → customer sees update in real time
```

---

## 10. Admin Panel

Route: `/admin` — ADMIN and SUPER_ADMIN only.

| Section | What you can do |
|---|---|
| Dashboard | Revenue bar chart, bookings-by-status pie chart, key metrics |
| Bookings | Full list with status filter; view booking details |
| Experts | Search by name; view / approve / reject KYC documents (image preview dialog); toggle active status |
| Customers | List all customers |
| Services | Create / edit / toggle active services (name, tagline, rate_per_hour, image_url, icon_name) |
| Coupons | Create FLAT or PERCENT coupons with usage limits, minimum order, and expiry |
| CMS | Edit page content by slug; manage hero banners (image URL, link, sort order, active toggle) |
| Support | View all support tickets; reply as staff; close tickets |
| Settings | Manage public and admin key-value settings |

Adding a new admin section: add a tab to the sidebar nav array in `admin.index.tsx`, add a corresponding `section === "your-section"` block in the content area, and wire up the API calls.

---

## 11. Adding a New Feature — Checklist

### New API endpoint

1. Add the route in `backend/server/routes/<domain>.js` with `asyncHandler()` wrapper.
2. Implement the handler in `backend/server/controllers/<domain>Controller.js`.
3. Add DB queries to `backend/server/models/<Domain>Model.js` if needed.
4. Add `authMiddleware` + `requireRole(...)` in the route file for protected endpoints.
5. Wrap read routes with `cacheMiddleware(ttl)` if data changes infrequently; call `bustCache(prefix)` in the corresponding mutation.

### New frontend page

1. Create `frontend/src/routes/your-page.tsx` with `createFileRoute("/your-path")`.
2. Export a component; add the `head()` meta for the page title.
3. Router picks it up automatically. Add a link from `Footer.tsx` or `Navbar.tsx` if needed.

### New external provider

1. Create `backend/server/providers/yourProvider.js`.
2. Check `const ENABLED = Boolean(process.env.YOUR_KEY)` at the top.
3. Export real implementation when enabled, mock when not. Log clearly in mock mode.
4. Import and call from the controller that needs it.

### New notification type

1. Call `notify(userId, { type, title, body, bookingId })` from the relevant controller.
2. Notification is saved to DB + emitted via `emitToUser()` simultaneously.
3. `NotificationBell` component in `Navbar.tsx` polls `/notifications` for unread count.

### New realtime event

1. Call `emitToBooking(bookingId, "event_name", payload)` or `emitToUser(userId, ...)` from the controller.
2. In the frontend: `socket?.on("event_name", handler)` inside a `useEffect`.

---

## 12. Going to Production

### Required before launch

1. **Strong JWT secret:**
   ```bash
   openssl rand -hex 32
   # → paste result as JWT_SECRET in .env
   ```
2. **Set `NODE_ENV=production`** — activates JWT strength guard and strict CORS.
3. **Set `ALLOWED_ORIGINS`** — your frontend domain(s), comma-separated.
4. **Set `PUBLIC_BACKEND_URL`** — base URL for uploaded file links (e.g. `https://api.homehero.com`).
5. **Set `REDIS_URL`** if running more than one API process.
6. **Set Razorpay keys** — `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
7. **Set SMS keys** — `MSG91_AUTH_KEY` (recommended for India) or Twilio.
8. **Set `FIREBASE_SERVICE_ACCOUNT`** — for mobile push notifications.
9. **Nginx config** — reverse-proxy `/api/` and WebSocket upgrades to Node; serve `frontend/dist/` as static files.
10. **DB user** — create a dedicated MySQL user with `SELECT, INSERT, UPDATE, DELETE` on `homehero.*` only.

### Scaling checklist

| Need | What to do |
|---|---|
| Multiple API processes | Set `REDIS_URL` (enables shared cache, BullMQ, Socket.IO Redis adapter) |
| Read replicas | Add a second pool in `db.js`; route read-only model methods to it |
| S3 file storage | Implement `storageProvider.upload()`, call it from `routes/uploads.js`, remove local `express.static` |
| Rate limit tuning | Adjust `RATE_LIMIT_API`, `RATE_LIMIT_AUTH`, `RATE_LIMIT_OTP` in `.env` |
| Larger dispatch radius | Set `DISPATCH_RADIUS_KM` env var |

---

## 13. External Services Reference

| Service | Purpose | Env vars needed | When mocked |
|---|---|---|---|
| **Razorpay** | Card / UPI / NetBanking payments and wallet top-up | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Returns fake order ID; `verifySignature` accepts `"mock_signature"` |
| **MSG91** | SMS OTP (India, preferred) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID` | OTP printed to `console.log` |
| **Twilio** | SMS OTP fallback | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | OTP printed to `console.log` |
| **Firebase FCM** | Push notifications | `FIREBASE_SERVICE_ACCOUNT` (JSON, single line) | Notification printed to `console.log` |
| **Redis** | Dispatch queue (BullMQ), Socket.IO multi-instance, response cache | `REDIS_URL` | In-process `setTimeout` queue; per-process memory cache; single-instance Socket.IO |
| **AWS S3** | Production file storage for KYC docs | `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Files saved locally to `backend/uploads/` |

---

*Last updated: June 2026 · Branch: `feature/marketplace-complete`*
