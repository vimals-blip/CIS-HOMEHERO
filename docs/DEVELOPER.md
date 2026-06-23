# HomeHero — Complete Developer Guide

> **Who this is for:** A developer with about 1 year of JavaScript experience. You do not need to already know Node.js, Express, Prisma, or Socket.IO. This guide teaches each technology *as it is used in this project* — explaining what it is, why it was chosen, where to find it in the code, and how to work with it.

---

## Table of Contents
1. [What Is HomeHero?](#1-what-is-homehero)
2. [Technology Stack — What Each Tool Is and Why We Use It](#2-technology-stack)
3. [First-Time Local Setup](#3-first-time-local-setup)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Environment Variables](#5-environment-variables)
6. [Backend — How It Works](#6-backend)
   - 6.1 [Express.js — The Web Framework](#61-expressjs)
   - 6.2 [How a Request Travels Through the App](#62-request-lifecycle)
   - 6.3 [Authentication — JWT and Refresh Tokens](#63-authentication)
   - 6.4 [Database — Prisma ORM and MySQL](#64-database)
   - 6.5 [Routes and Controllers](#65-routes-and-controllers)
   - 6.6 [Middleware — Every Piece Explained](#66-middleware)
   - 6.7 [Payment Gateway — Razorpay and Stripe](#67-payment-gateway)
   - 6.8 [Booking Dispatch — How Experts Are Matched](#68-booking-dispatch)
   - 6.9 [Real-Time — Socket.IO Explained](#69-real-time)
   - 6.10 [File Uploads](#610-file-uploads)
   - 6.11 [Notifications](#611-notifications)
   - 6.12 [Caching](#612-caching)
   - 6.13 [Error Handling](#613-error-handling)
7. [Database Schema — Every Table](#7-database-schema)
8. [Frontend — How It Works](#8-frontend)
   - 8.1 [TanStack Router — File-Based Routing](#81-tanstack-router)
   - 8.2 [TanStack Query — Data Fetching](#82-tanstack-query)
   - 8.3 [Auth Context](#83-auth-context)
   - 8.4 [API Client — lib/api.ts](#84-api-client)
   - 8.5 [Socket Client — lib/socket.ts](#85-socket-client)
   - 8.6 [Every Page Explained](#86-every-page)
   - 8.7 [React Hooks Rules You Must Know](#87-react-hooks-rules)
   - 8.8 [Tailwind CSS and shadcn/ui](#88-tailwind-and-shadcn)
9. [Complete End-to-End Flows](#9-end-to-end-flows)
10. [How to Make Common Changes](#10-how-to-make-changes)
11. [Admin Panel — Full Guide](#11-admin-panel)
12. [Hosting and Deployment](#12-hosting-and-deployment)
13. [Daily Operations on a Live Server](#13-daily-operations)
14. [Debugging Common Problems](#14-debugging)
15. [Security — What We Do and Why](#15-security)
16. [Quick Reference Card](#16-quick-reference)

---

## 1. What Is HomeHero?

HomeHero is an **on-demand home services marketplace** — similar to UrbanClap or Snabbit. A customer opens the app, picks a service (cleaning, cooking, laundry), pays, and a trained verified worker ("Expert") shows up at their door. The customer can track the expert live on a map.

### Three types of users

| Role | What they can do |
|------|-----------------|
| **CUSTOMER** | Browse services, book, pay (cash / wallet / card), track expert on live map, review, manage wallet |
| **EXPERT** | Go online/offline, accept jobs, advance booking status, upload ID documents, withdraw earnings |
| **ADMIN / SUPER_ADMIN** | Manage everything: verify experts, handle support, configure payment gateways, run analytics, manage CMS |

### How the money flows

```
Customer pays ₹1000
  ├── Platform fee (e.g. 15%) = ₹150  → HomeHero keeps this
  └── Expert amount (85%)    = ₹850  → Expert's wallet (withdrawable)
```

---

## 2. Technology Stack

This section explains every technology, what it is, and exactly why we chose it.

---

### Node.js — The Backend Runtime

**What it is:** Node.js lets you run JavaScript on a server (not just in a browser). It is built on Chrome's V8 engine.

**Why we use it:** Our team knows JavaScript. Node is very fast for I/O-heavy work (reading DB, calling APIs) because it is non-blocking — while waiting for a database response it handles other requests instead of sitting idle.

**Key concept — async/await:** Almost every function in the backend is `async`. This means it returns a Promise. `await` pauses inside an async function until the Promise resolves.

```js
// Old style (callback hell) — don't do this:
db.query('SELECT * FROM users WHERE id = ?', [id], function(err, rows) {
  if (err) handleError(err);
  doSomethingWith(rows[0]);
});

// Modern async/await (what we use — clean and readable):
const user = await prisma.users.findUnique({ where: { id } });
doSomethingWith(user);
```

---

### Express.js — The Web Framework

**What it is:** Express is a minimal HTTP framework for Node.js. It handles requests and lets you define routes and middleware.

**Why we use it:** Most widely used Node.js framework. Simple, well-documented, huge ecosystem.

**How it works:**
```js
import express from 'express';
const app = express();

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(4001, () => console.log('Server running on :4001'));
```

**In our project (`backend/server/api.js`):**
```js
const app = express();
app.use(express.json());           // parse JSON request bodies
app.use(corsMiddleware);           // handle CORS
app.use('/api/v1/auth',     authRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/admin',    adminRouter);
app.use(errorHandler);             // MUST be last
app.listen(4001);
```

---

### MySQL 8 — The Database

**What it is:** MySQL is a relational database. Data is stored in tables with rows and columns — like spreadsheets that can link to each other.

**Why we use it (and not MongoDB):** HomeHero has complex relationships — a booking links a customer, expert, service, payment, and status events. Relational databases handle these JOIN queries efficiently and guarantee data consistency with ACID transactions (debit wallet + create booking = both succeed or both rollback).

---

### Prisma — The ORM (Object-Relational Mapper)

**What it is:** Prisma sits between Node.js code and MySQL. Instead of writing raw SQL, you write JavaScript objects and Prisma translates them.

**Why we use it:**
- Type-safe queries — TypeScript knows what columns exist
- Schema-as-code in `backend/prisma/schema.prisma`
- Easy migration with `prisma db push`

**How it works:**
```js
import prisma from '../prisma.js';

// SELECT * FROM users WHERE email = 'x@y.com'
const user = await prisma.users.findUnique({ where: { email: 'x@y.com' } });

// INSERT INTO bookings (...)
const booking = await prisma.bookings.create({
  data: { customer_id: '123', service_id: '456', status: 'SEARCHING' }
});

// UPDATE experts SET status = 'ONLINE' WHERE id = '789'
await prisma.experts.update({ where: { id: '789' }, data: { status: 'ONLINE' } });
```

**Complex JOINs** — for queries joining 4-5 tables we use raw SQL via `$queryRaw`:
```js
// Prisma.sql prevents SQL injection — values are parameterised, not concatenated
const rows = await prisma.$queryRaw`
  SELECT b.*, cust.name AS customer_name, ep.name AS expert_name
  FROM bookings b
  LEFT JOIN profiles cust ON cust.id = b.customer_id
  LEFT JOIN profiles ep   ON ep.id   = b.expert_id
  WHERE b.id = ${bookingId}
`;
```

---

### Socket.IO — Real-Time Communication

**What it is:** Socket.IO enables two-way real-time communication. Unlike regular HTTP (browser asks → server answers → connection closes), Socket.IO keeps the connection open so the server can push data at any time.

**Why we use it:**
- Expert GPS location must update on the customer's map every 10 seconds
- "Expert is on the way!" must appear instantly without the customer refreshing
- Admin alarm rings when a booking has no expert

**Mental model:**
```
Browser opens Socket.IO connection
          ↕  (connection stays open)
Server can push events to browser anytime
Browser can also send events to server anytime

// Server emits:
io.to(`booking:bk-123`).emit('booking_assigned', { expert: 'Ravi' })

// Browser receives:
socket.on('booking_assigned', (data) => showToast(`${data.expert} assigned!`))
```

---

### JWT — Authentication Tokens

**What it is:** A JWT (JSON Web Token) is a compact, cryptographically signed token that proves who you are. It has three parts separated by dots: `header.payload.signature`. The payload carries `{ user_id, email, role }`.

**Why two tokens (access + refresh)?** The access token is short-lived (15 min) — if stolen, it expires quickly. The refresh token is long-lived (30 days) but stored in the database, so we can revoke it instantly.

```
LOGIN → { accessToken (15min JWT), refreshToken (30day random string in DB) }

Every API request:
  Authorization: Bearer <accessToken>
  → server verifies signature → extracts { user_id, role } → allow

When access token expires (401):
  POST /auth/refresh { refreshToken }
  → server checks DB hash → issues new pair
  → frontend retries the original request transparently
```

---

### React 19 — The Frontend UI Library

**What it is:** React is a JavaScript library for building UIs. Instead of manually updating HTML when data changes, you describe what the UI *should look like* and React figures out what to update.

**Key concept — components:** Everything is a function returning JSX:
```tsx
function BookingCard({ booking }) {
  return (
    <div className="rounded-xl border p-4">
      <h3>{booking.service_name}</h3>
      <p>Status: {booking.status}</p>
    </div>
  );
}
```

**Key concept — state:** When state changes, React re-renders:
```tsx
const [count, setCount] = useState(0);
<button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
```

---

### TanStack Router — URL Routing

**What it is:** Maps URLs to components. Every file in `src/routes/` automatically becomes a URL.

`book.$serviceId.tsx` → `/book/:serviceId`
`admin.index.tsx` → `/admin`

No manual route registration needed.

---

### TanStack Query — Server Data Fetching

**What it is:** Manages fetching, caching, and syncing server data in React.

**Why not `useEffect + fetch`?** Loading states, error states, caching, refetching — all handled automatically.

```tsx
// With TanStack Query (clean):
const { data, isLoading } = useQuery({
  queryKey: ['bookings'],
  queryFn: () => apiFetch('/bookings'),
});
```

---

### Tailwind CSS — Styling

**What it is:** Utility-first CSS framework. Apply small classes directly in JSX instead of writing CSS files.

```tsx
// Instead of: .card { border-radius: 12px; padding: 16px; border: 1px solid #e5; }
<div className="rounded-xl p-4 border">...</div>
```

---

### shadcn/ui — UI Components

**What it is:** Pre-built accessible React components (Button, Dialog, Input) using Tailwind. You own the source code in `frontend/src/components/ui/` — fully customizable.

---

### BullMQ — Background Job Queue

**What it is:** Runs tasks in the background. When a booking is created and no expert is available, we enqueue a retry job and return the HTTP response immediately — no waiting.

**Where:** `backend/server/queues/dispatchQueue.js`. Falls back to `setTimeout` if Redis is unavailable.

---

## 3. First-Time Local Setup

### Prerequisites

```bash
node --version    # need v20+
mysql --version   # need 8.x
```

**Install Node.js 20 on Ubuntu:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
```

**Install MySQL on Ubuntu:**
```bash
sudo apt update && sudo apt install mysql-server -y
sudo systemctl start mysql && sudo systemctl enable mysql
sudo mysql_secure_installation
```

**Install Redis (optional but recommended):**
```bash
sudo apt install redis-server -y
sudo systemctl start redis-server
redis-cli ping   # should print: PONG
```

### Step-by-step setup

```bash
# 1. Enter the project
cd /var/www/html/Urban-Service/homehero-spark

# 2. Install all dependencies (backend + frontend together)
npm run install:all

# 3. Create the MySQL database
mysql -u root -p -e "CREATE DATABASE homehero CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Configure environment
cp backend/.env.example backend/.env
nano backend/.env
# Set at minimum:
#   DATABASE_URL=mysql://root:YOUR_PASSWORD@127.0.0.1:3306/homehero
#   JWT_SECRET=any-string-32-chars-or-longer

# 5. Create all database tables
npm run db:migrate

# 6. Seed demo data
npm run db:seed

# 7. Start everything
npm run dev:all
```

Open **http://localhost:8080**

### Demo accounts (password: `Password123`)

| Account | Email |
|---------|-------|
| Customer | `customer@snabbit.test` |
| Expert | `e1@snabbit.test` |
| Admin | `admin@homehero.test` |
| Super Admin | `superadmin@homehero.test` |

### Start/stop services

```bash
npm run dev:backend      # API only (:4001)
npm run dev:frontend     # Frontend only (:8080)

# Kill monolith safely (never use pkill -f):
kill $(lsof -ti tcp:4001 -sTCP:LISTEN)

# Restart in background:
nohup node backend/server/api.js > /tmp/monolith.log 2>&1 & disown
tail -f /tmp/monolith.log
```

---

## 4. Project Folder Structure

```
homehero-spark/
├── package.json              ← Root scripts: dev:all, db:migrate, build
├── docker-compose.yml        ← Docker deployment
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     ← ★ THE DATABASE SCHEMA — edit this to change tables
│   │
│   └── server/               ← The monolith (port 4001)
│       ├── api.js            ← Express app: middleware chain + route mounts
│       ├── prisma.js         ← Prisma client singleton — import for all DB access
│       ├── errors.js         ← BadRequest(), NotFound(), Forbidden()
│       ├── utils.js          ← asyncHandler() and small helpers
│       ├── seed.js           ← Demo data
│       │
│       ├── auth/
│       │   └── tokens.js     ← JWT sign/verify, refresh token helpers
│       │
│       ├── controllers/      ← What happens when a route is hit
│       │   ├── authController.js
│       │   ├── bookingController.js  ← most complex
│       │   ├── expertController.js
│       │   ├── paymentController.js
│       │   ├── adminController.js
│       │   ├── walletController.js
│       │   ├── serviceController.js
│       │   ├── couponController.js
│       │   ├── notificationController.js
│       │   ├── supportController.js
│       │   ├── cmsController.js
│       │   └── reviewController.js
│       │
│       ├── middleware/       ← Functions that run before controllers
│       │   ├── auth.js       ← Verify JWT, check roles
│       │   ├── rateLimit.js  ← Prevent abuse
│       │   ├── cors.js       ← Allow/block cross-origin requests
│       │   ├── sanitize.js   ← Strip HTML from inputs (XSS prevention)
│       │   ├── cache.js      ← Cache GET responses
│       │   └── errorHandler.js ← Catch all errors, return clean JSON
│       │
│       ├── models/           ← Database query functions (called by controllers)
│       │   ├── BookingModel.js    ← most complex: JOINs across 5+ tables
│       │   ├── ExpertModel.js
│       │   ├── UserModel.js
│       │   ├── WalletModel.js
│       │   ├── PaymentModel.js
│       │   └── NotificationModel.js
│       │
│       ├── providers/        ← External services with mock fallback
│       │   ├── paymentProvider.js ← Razorpay + Stripe; DB-backed config
│       │   ├── smsProvider.js    ← MSG91 / Twilio OTP
│       │   ├── storageProvider.js ← Local disk → S3 swap point
│       │   └── fcmProvider.js    ← Firebase push notifications
│       │
│       ├── queues/
│       │   └── dispatchQueue.js  ← BullMQ or setTimeout retry queue
│       │
│       ├── realtime/
│       │   └── io.js            ← Socket.IO server
│       │
│       ├── routes/           ← URL definitions
│       │   ├── auth.js
│       │   ├── bookings.js
│       │   ├── experts.js
│       │   ├── payments.js
│       │   ├── services.js
│       │   ├── admin.js
│       │   ├── wallet.js
│       │   ├── notifications.js
│       │   ├── support.js
│       │   ├── cms.js
│       │   ├── reviews.js
│       │   └── uploads.js
│       │
│       └── services/         ← Business logic not tied to HTTP
│           ├── dispatchService.js     ← Expert matching algorithm
│           ├── notificationService.js ← DB insert + socket emit together
│           └── auditService.js        ← Log admin actions
│
├── frontend/
│   └── src/
│       ├── routes/           ← One file = one URL (file-based routing)
│       │   ├── __root.tsx    ← Root layout: Navbar, Footer, wraps ALL pages
│       │   ├── index.tsx     ← /
│       │   ├── auth.login.tsx
│       │   ├── auth.signup-customer.tsx
│       │   ├── auth.signup-expert.tsx    ← 3-step wizard
│       │   ├── book.$serviceId.tsx       ← /book/:serviceId
│       │   ├── bookings.tsx
│       │   ├── track.$bookingId.tsx      ← /track/:id (live map)
│       │   ├── expert.index.tsx          ← /expert (dashboard)
│       │   ├── wallet.tsx
│       │   ├── account.tsx
│       │   ├── support.tsx
│       │   ├── notifications.tsx
│       │   └── admin.index.tsx           ← /admin (entire admin panel)
│       │
│       ├── components/
│       │   ├── layout/       ← Navbar, Footer, NotificationBell
│       │   ├── booking/      ← BookingTracker, LiveMap
│       │   ├── shared/       ← Avatar, LoadingSpinner, StatusBadge
│       │   └── ui/           ← shadcn/ui: Button, Input, Dialog...
│       │
│       └── lib/
│           ├── api.ts         ← apiFetch() — every API call goes here
│           ├── auth-context.tsx ← useAuth() — who is logged in
│           ├── socket.ts      ← getSocket() — Socket.IO connection
│           ├── sound.ts       ← Web Audio API notification sounds
│           ├── icons.ts       ← DB icon names → Lucide React components
│           └── utils.ts       ← cn() Tailwind class merge helper
│
├── docs/                     ← Documentation
└── deploy/                   ← nginx.conf, PM2 config, Caddyfile
```

---

## 5. Environment Variables

All config for the backend lives in `backend/.env`.

### Required to run locally

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `mysql://root:pass@127.0.0.1:3306/homehero` | How Prisma connects to MySQL |
| `JWT_SECRET` | any 32+ character string | Signs JWT tokens. Changing it logs everyone out |

### Security (important in production)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | unset | Set to `production` for strict mode |
| `ALLOWED_ORIGINS` | `http://localhost:8080` | Which frontends can call the API. **Set to your domain in production** |
| `PUBLIC_BACKEND_URL` | unset | Base URL for uploaded file links. Set to `https://api.yourdomain.com` |
| `FRONTEND_URL` | `http://localhost:5173` | Used by Stripe to build redirect URLs |
| `TRUST_PROXY` | `1` | Trust nginx X-Forwarded-For header (for correct rate limiting) |

### Rate limiting (optional, defaults work)

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMIT_API` | `300` | Requests per minute per IP |
| `RATE_LIMIT_AUTH` | `20` | Login attempts per 15min per IP |
| `RATE_LIMIT_OTP` | `5` | OTP requests per 15min per IP+phone |

### Payment keys (optional — mocked when absent)

> Prefer Admin Panel → Settings → Payment Gateway over env vars. DB settings override env vars.

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Razorpay credentials |
| `STRIPE_TEST_SECRET_KEY` + `STRIPE_TEST_PUBLISHABLE_KEY` | Stripe test |
| `STRIPE_LIVE_SECRET_KEY` + `STRIPE_LIVE_PUBLISHABLE_KEY` | Stripe live |
| `PAYMENT_GATEWAY` | `RAZORPAY` or `STRIPE` |
| `PAYMENT_MODE` | `TEST` or `LIVE` |

### External services (all optional — logged/mocked when absent)

| Variable | Service | Without it |
|----------|---------|-----------|
| `REDIS_URL` | Redis | In-memory queue + cache, single-instance Socket.IO |
| `MSG91_AUTH_KEY` etc. | SMS OTP | OTP printed to console.log |
| `FIREBASE_SERVICE_ACCOUNT` | Push notifications | Logs to console.log |

---

## 6. Backend — How It Works

### 6.1 Express.js

**File: `backend/server/api.js`**

This is the entry point. It creates the Express app, applies middleware, mounts routes, and starts the server.

```js
import express from 'express';
import { createServer } from 'http';
import { setupSocket } from './realtime/io.js';

const app = express();
const httpServer = createServer(app);  // Wrap Express in HTTP server for Socket.IO

// Global middleware — runs on EVERY request, in this order:
app.use(helmet());           // Security headers
app.use(compression());      // gzip/brotli response compression
app.use(corsMiddleware);      // CORS validation
app.use(express.json());      // Parse JSON request bodies
app.use(sanitizeBody);        // Strip HTML from all inputs

// Health check (no rate limit — for load balancers)
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Rate limiting — applied to all /api/v1 routes
app.use('/api/v1', apiLimiter);

// Routes
app.use('/api/v1/auth',          authRouter);
app.use('/api/v1/bookings',      bookingRouter);
app.use('/api/v1/payments',      paymentRouter);
app.use('/api/v1/admin',         adminRouter);
// ... more routes

// Error handler — MUST be last
app.use(errorHandler);

// Start Socket.IO on the same server (same port — no extra port)
setupSocket(httpServer);

httpServer.listen(4001);
```

### 6.2 Request Lifecycle

Every request passes through these layers in order:

```
POST /api/v1/bookings  (with Authorization: Bearer TOKEN)
       │
   helmet()     → adds 15 security response headers
       │
   compression() → will compress the response with gzip
       │
   cors()        → is this origin in ALLOWED_ORIGINS? Yes → continue
       │
   express.json() → parses { "service_id": "abc" } from request body
       │
   sanitize()    → strips any <script> tags from the body
       │
   apiLimiter    → is this IP under 300 req/min? Yes → continue
       │
   authMiddleware → verifies Bearer JWT → sets req.user = { id, role }
       │
   bookingController.create()  → validates inputs, creates booking
       │
   BookingModel.create()       → INSERT INTO bookings ...
       │
   res.json({ id: "bk-123" })  → sends response
       │
   (if anything threw above) → errorHandler → { error, message } JSON
```

### 6.3 Authentication

**Files:** `backend/server/auth/tokens.js`, `backend/server/middleware/auth.js`

#### Login flow step by step

**1. User POSTs credentials:**
```
POST /api/v1/auth/login
Body: { "email": "customer@snabbit.test", "password": "Password123" }
```

**2. Backend verifies password (bcrypt):**
```js
// authController.js
const user = await UserModel.findByEmail(email);
const valid = await bcrypt.compare(password, user.password_hash);
// bcrypt.compare handles the salt automatically — plain text never stored
if (!valid) throw BadRequest('INVALID_CREDENTIALS', 'Wrong email or password');
```

**3. Backend creates the token pair:**
```js
// tokens.js
// Access token: JWT, expires in 15 minutes
const accessToken = jwt.sign(
  { user_id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token: random 96-char hex string (NOT a JWT — so it can't be misused as one)
const refreshToken = crypto.randomBytes(48).toString('hex');

// Store HASH of refresh token in DB (so a leaked DB doesn't expose tokens)
const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
await prisma.refresh_tokens.create({
  data: { user_id: user.id, token_hash: hash, expires_at: thirtyDaysFromNow }
});
```

**4. Frontend stores tokens and uses them:**
```ts
// api.ts — after login:
localStorage.setItem('homehero_token', accessToken);
localStorage.setItem('homehero_refresh', refreshToken);

// Every apiFetch call adds:
headers: { 'Authorization': `Bearer ${accessToken}` }
```

**5. Backend checks on every protected request:**
```js
// middleware/auth.js
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN" → "TOKEN"
  if (!token) throw Forbidden();
  
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  // jwt.verify throws if token is invalid or expired
  
  req.user = { id: payload.user_id, email: payload.email, role: payload.role };
  next(); // pass to the controller
}
```

**6. Role guards on admin routes:**
```js
// middleware/auth.js
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw Forbidden();
  next();
};

// Usage in routes/admin.js:
router.get('/overview',
  authMiddleware,                         // must be logged in
  requireRole('ADMIN', 'SUPER_ADMIN'),    // must have one of these roles
  asyncHandler(getOverview)
);

// Inside controllers — check admin for bypassing ownership rules:
export function isAdmin(user) {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}
```

### 6.4 Database

**The schema file: `backend/prisma/schema.prisma`**

Every table is defined as a Prisma `model`. Example:
```prisma
model bookings {
  id             String   @id @default(uuid())
  customer_id    String
  expert_id      String?                       // ? = nullable
  service_id     String
  status         String   @default("SEARCHING")
  total_amount   Decimal
  payment_method String   @default("CASH")
  created_at     DateTime @default(now())
}
```

**Changing the schema:**
```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Apply to MySQL:
cd backend && npm run db:migrate
# = prisma db push = sends ALTER TABLE / CREATE TABLE to MySQL
```

**The Model pattern — Controllers call Models, Models call Prisma:**
```
bookingController.create()
    └── BookingModel.create(data)
            └── prisma.bookings.create({ data })
                    └── INSERT INTO bookings ...
```

**Example model file:**
```js
// models/BookingModel.js
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';

export const BookingModel = {

  // Simple create
  async create(data, tx = prisma) {
    // tx = transaction client (optional — defaults to global prisma)
    return tx.bookings.create({ data });
  },

  // Complex JOIN query using raw SQL
  async findById(id) {
    const rows = await prisma.$queryRaw`
      SELECT b.*,
        cust.name AS customer_name,
        ep.name   AS expert_name,
        s.name    AS service_name,
        e.current_lat AS expert_lat, e.current_lng AS expert_lng
      FROM bookings b
      LEFT JOIN profiles cust ON cust.id = b.customer_id
      LEFT JOIN profiles ep   ON ep.id   = b.expert_id
      LEFT JOIN services s    ON s.id    = b.service_id
      LEFT JOIN experts e     ON e.id    = b.expert_id
      WHERE b.id = ${id}
    `;
    return rows[0] ?? null;
  },

  // Dynamic filter — build WHERE clause from optional params
  async findAll({ status, customerId } = {}) {
    const filters = [Prisma.sql`1=1`];
    if (status)     filters.push(Prisma.sql`b.status = ${status}`);
    if (customerId) filters.push(Prisma.sql`b.customer_id = ${customerId}`);
    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
    return prisma.$queryRaw`SELECT * FROM bookings b ${where} ORDER BY b.created_at DESC`;
  },
};
```

**Transactions — multiple writes that must all succeed:**
```js
// Example: debit wallet AND create booking atomically
// If either fails → both roll back automatically
const bookingId = await prisma.$transaction(async (tx) => {
  await WalletModel.debitWithConn(tx, userId, amount, null, 'Booking payment');
  const id = await BookingModel.create(payload, tx);
  return id;
});
```

### 6.5 Routes and Controllers

**Pattern:**
```
routes/bookings.js        → POST /bookings → bookingController.create
controllers/bookingController.js → does the work
models/BookingModel.js    → does the DB queries
```

**Route file example:**
```js
// routes/bookings.js
import express from 'express';
import { create, getOne, updateStatus } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils.js';

const router = express.Router();

router.post('/',             authMiddleware, asyncHandler(create));
router.get('/:id',           authMiddleware, asyncHandler(getOne));
router.patch('/:id/status',  authMiddleware, asyncHandler(updateStatus));

export default router;
```

**Controller function example:**
```js
// controllers/bookingController.js
export async function create(req, res) {
  const { service_id, duration_hours, payment_method, address_snapshot } = req.body;

  // Validate
  if (!service_id)        throw BadRequest('MISSING_FIELD', 'service_id is required');
  if (!address_snapshot)  throw BadRequest('MISSING_FIELD', 'address is required');

  // Load service, calculate amounts
  const service = await ServiceModel.findById(service_id);
  if (!service) throw NotFound('Service not found');
  
  const base = Number(service.rate_per_hour) * duration_hours;
  const platformFee = Math.round(base * 0.15);
  const expertAmount = base - platformFee;

  // Create booking
  const bookingId = await BookingModel.create({
    customerId: req.user.id,
    serviceId: service_id,
    status: 'SEARCHING',
    baseAmount: base,
    platformFee,
    expertAmount,
    totalAmount: base,
    paymentMethod: payment_method,
    addressSnapshot: address_snapshot,
  });

  // Try to dispatch immediately
  const booking = await BookingModel.findById(bookingId);
  await dispatchService.dispatch(booking);

  res.status(201).json(booking);
}
```

**Why `asyncHandler`?** It wraps async controller functions so that if they throw, Express catches it correctly:
```js
// utils.js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
// .catch(next) passes errors to errorHandler middleware
```

### 6.6 Middleware

Middleware functions receive `(req, res, next)`. Call `next()` to continue, throw to stop.

#### `auth.js` — JWT Verification

```js
// Verifies the JWT. Used on every protected route.
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;   // "Bearer eyJ..."
  const token  = header?.split(' ')[1];       // "eyJ..."
  if (!token) throw Forbidden();

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  // Throws JsonWebTokenError if invalid or expired
  
  req.user = { id: payload.user_id, email: payload.email, role: payload.role };
  next();
}
```

#### `rateLimit.js` — Abuse Prevention

**What is rate limiting?** Stops attackers from sending thousands of requests per second (brute-force login, spam, DoS attacks).

```js
import rateLimit from 'express-rate-limit';

// Applied to all /api/v1 routes: max 300 requests per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1-minute window
  max: 300,
  message: { error: 'RATE_LIMITED', message: 'Slow down — too many requests' }
});

// Applied to login/signup: max 20 attempts per 15 minutes
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
```

#### `cors.js` — Cross-Origin Resource Sharing

**What is CORS?** Browsers block requests from `localhost:8080` to `localhost:4001` by default (different origins). CORS headers tell the browser it's allowed.

```js
const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',');

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) cb(null, true);   // allow
    else cb(new Error('CORS: origin not allowed'));              // block
  },
  credentials: true,  // allow cookies/auth headers
});
```

#### `sanitize.js` — XSS Prevention

**What is XSS?** If a user enters `<script>alert("hacked")</script>` and we store+display it, their script runs in other users' browsers. We strip all HTML tags from inputs.

```js
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '');  // remove everything inside < >
}

export const sanitizeBody = (req, res, next) => {
  req.body = deepStrip(req.body);  // recursively strip all string values
  next();
};
```

#### `cache.js` — Response Caching

Caching stores GET responses so repeated requests don't hit the database:

```js
// In a route file:
router.get('/', cacheMiddleware(120), asyncHandler(listServices));
// First request: hits DB, stores result for 120 seconds
// Next 120 seconds: served from cache instantly, no DB hit

// After mutating the data — invalidate the cache:
bustCache('/api/v1/services');
```

#### `errorHandler.js` — Unified Error Responses

```js
// The LAST middleware in api.js — catches everything thrown above
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong'
  });
}
```

**Always throw, never manually write error responses:**
```js
// errors.js helpers:
throw BadRequest('COUPON_EXPIRED', 'This coupon has expired');  // → 400
throw NotFound('Booking not found');                             // → 404
throw Forbidden();                                               // → 403
```

### 6.7 Payment Gateway

**File: `backend/server/providers/paymentProvider.js`**

All gateway config comes from the `settings` DB table with a 10-second cache. Admin Panel changes take effect immediately (cache cleared on save). Config priority:

```
DB settings (Admin Panel) → .env variables → mock mode
```

**Mock mode (development)** — No real money, everything works:
```js
// Returns fake IDs, accepts "mock_signature" for verification
const mock = {
  async createOrder({ amount }) {
    return { id: `order_mock_${Date.now()}`, mock: true };
  },
  async verifyPayment({ signature }) {
    return signature === 'mock_signature';
  }
};
```

**Razorpay flow:**
```
1. POST /payments/create-order (or POST /bookings with ONLINE payment)
   Backend → razorpay.orders.create({ amount: 100000, currency: "INR" })
   Returns { gateway_order_id, gateway_amount, gateway_key_id }

2. Frontend opens Razorpay popup modal
   new Razorpay({ key, order_id, amount, handler: onSuccess }).open()

3. User pays → onSuccess fires with { razorpay_order_id, razorpay_payment_id, razorpay_signature }

4. Frontend → POST /payments/verify { order_id, payment_id, signature }
   Backend → verifies: HMAC-SHA256(order_id + "|" + payment_id, secret) === signature
   → PAID → booking active
```

**Stripe flow:**
```
1. POST /payments/create-order
   Backend → stripe.checkout.sessions.create({ success_url, cancel_url, line_items })
   Returns { checkout_url: "https://checkout.stripe.com/pay/cs_test_..." }

2. Frontend → window.location.href = checkout_url
   (user goes to Stripe's hosted page — handles 3DS, all card types automatically)

3. Stripe redirects back to:
   /track/BOOKING_ID?stripe_done=cs_test_SESSION_ID

4. Track page detects ?stripe_done= on mount
   → POST /payments/verify { order_id: "cs_test_..." }
   Backend → stripe.checkout.sessions.retrieve(sessionId)
   → payment_status === "paid" → confirmed
```

**Switching gateways with no restart:**
Admin Panel → Settings → Payment Gateway → choose gateway + mode → enter keys → Save.

### 6.8 Booking Dispatch

**File: `backend/server/services/dispatchService.js`**

When a booking is created, the system finds the best expert immediately:

```js
async function findBestExpert(serviceId, bookingCoords) {
  // 1. All online, non-busy experts who offer this service
  const candidates = await ExpertModel.findCandidatesForService(serviceId);
  if (!candidates.length) return null;
  // 2. Score by distance (Haversine formula = great-circle km)
  const scored = candidates.map(expert => {
    const distance = (expert.current_lat && bookingCoords?.lat)
      ? haversineKm(bookingCoords, { lat: expert.current_lat, lng: expert.current_lng })
      : 9999;
    return { ...expert, distance };
  });

  // 3. Filter to dispatch radius (default 15km)
  const nearby = scored.filter(e => e.distance <= DISPATCH_RADIUS_KM);
  if (!nearby.length) return null;

  // 4. Sort: nearest → highest rating → fewest active jobs
  nearby.sort((a, b) =>
    a.distance - b.distance ||
    b.avg_rating - a.avg_rating ||
    a.active_jobs - b.active_jobs
  );

  return nearby[0];
}
```

**After finding a match:**
```js
await BookingModel.assign(bookingId, expert.id);             // booking → ASSIGNED
await ExpertModel.update(expert.id, { status: 'BUSY' });     // expert → won't get more bookings
emitToBooking(bookingId, 'booking_assigned', { expert_id }); // customer notified in real-time
await notify(customerId, { type: 'BOOKING_ASSIGNED', title: 'Expert assigned!' });
```

**When no expert found — retry queue:**
```js
// Retries up to 5 times, 8 seconds apart
await dispatchQueue.enqueueRetry(bookingId, 8000);
// Booking stays SEARCHING — admin alarm rings
```

### 6.9 Real-Time — Socket.IO

**File: `backend/server/realtime/io.js`**

Socket.IO shares the same port as Express (no extra port):
```js
import { Server } from 'socket.io';
const io = new Server(httpServer, { cors: { origin: ALLOWED_ORIGINS } });
// httpServer is the same server that Express uses on port 4001
```

**Every connection is authenticated:**
```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.user_id;
    socket.role   = payload.role;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});
```

**Rooms — send to specific users/bookings only:**
```js
// On connect — every user joins their personal room
socket.join(`user:${socket.userId}`);

// When customer opens track page:
socket.on('subscribe_booking', async (bookingId, callback) => {
  const booking = await BookingModel.findById(bookingId);
  const isParty = booking.customer_id === socket.userId || booking.expert_id === socket.userId;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(socket.role);
  
  if (!isParty && !isAdmin) return callback({ error: 'Not your booking' });
  
  socket.join(`booking:${bookingId}`);
  callback({ status: booking.status });
});
```

**Expert GPS streaming:**
```js
socket.on('expert_location', async ({ lat, lng }) => {
  if (socket.role !== 'EXPERT') return;

  await ExpertModel.setLocation(socket.userId, lat, lng);  // save to DB

  // Fan out to every customer watching this expert's active bookings
  const bookings = await BookingModel.findForExpert(socket.userId);
  for (const b of bookings) {
    if (ACTIVE_STATUSES.includes(b.status)) {
      io.to(`booking:${b.id}`).emit('expert_location_updated', { lat, lng });
    }
  }
});
```

**Sending events from controllers:**
```js
// notificationService.js exports these helpers:
emitToBooking(bookingId, 'booking_status_updated', { status: 'ON_THE_WAY' });
emitToUser(userId, 'notification', { title: 'Expert assigned!' });
```

### 6.10 File Uploads

**File: `backend/server/routes/uploads.js`**

We use **Multer** for handling multipart file uploads:

```js
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `uploads/${req.query.folder}/${req.user.id}/`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuid()}.${extension(file.mimetype)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },  // 8MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));  // reject other types
  },
});

router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  const fileUrl = `${process.env.PUBLIC_BACKEND_URL}/uploads/...`;
  res.json({ file_url: fileUrl });
});
```

**From the frontend:**
```ts
// lib/api.ts
export async function uploadFile(file: File, { folder }: { folder: string }) {
  const formData = new FormData();
  formData.append('file', file);
  // NEVER set Content-Type manually — browser adds the multipart boundary
  const res = await fetch(`${API_BASE}/uploads?folder=${folder}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();  // { file_url: "http://..." }
}
```

### 6.11 Notifications

**File: `backend/server/services/notificationService.js`**

Every notification does two things at once:
1. Saved to DB (visible in the notification inbox later)
2. Pushed via Socket.IO (visible immediately if user is online)

```js
export async function notify(userId, { type, title, body, bookingId = null }) {
  // 1. Persist to DB
  await prisma.notifications.create({
    data: { user_id: userId, type, title, body, booking_id: bookingId, is_read: false }
  });

  // 2. Push to connected socket
  emitToUser(userId, 'notification', { type, title, body, booking_id: bookingId });
}
```

**Usage:**
```js
await notify(booking.customer_id, {
  type: 'BOOKING_ASSIGNED',
  title: 'Expert assigned!',
  body: `${expertName} is on their way`,
  bookingId: booking.id,
});
```

### 6.12 Caching

Add caching to rarely-changing GET routes:
```js
// routes/services.js
router.get('/', cacheMiddleware(120), asyncHandler(listServices));
// Cached for 120 seconds. X-Cache: HIT or MISS header shows cache status.

// routes/cms.js
router.get('/pages/:slug', cacheMiddleware(120), asyncHandler(getPage));
```

Bust the cache after mutations:
```js
// controllers/serviceController.js
export async function createService(req, res) {
  const service = await ServiceModel.create(req.body);
  bustCache('/api/v1/services');  // next GET hits DB again
  res.status(201).json(service);
}
```

### 6.13 Error Handling

**Rule:** Never write `res.status(400).json({ error: '...' })` manually. Always throw.

```js
// errors.js exports these:
throw BadRequest('CODE', 'Message');   // HTTP 400
throw NotFound('Booking not found');   // HTTP 404
throw Forbidden();                     // HTTP 403
throw Conflict('EMAIL_TAKEN', '...');  // HTTP 409

// errorHandler returns:
// { "error": "CODE", "message": "Message" }

// Frontend reads this in useMutation:
onError: (e: any) => toast.error(e.message),  // shows "Message" to user
```

---

## 7. Database Schema — Every Table

Edit `backend/prisma/schema.prisma` then run `npm run db:migrate`.

### Identity and auth

| Table | Key columns | Purpose |
|-------|------------|---------|
| `users` | `id`, `email`, `password_hash`, `is_blocked` | Core identity |
| `profiles` | `id` (= user id), `name`, `phone`, `avatar_url`, `city` | Display info |
| `user_roles` | `user_id`, `role` | CUSTOMER / EXPERT / ADMIN / SUPER_ADMIN |
| `refresh_tokens` | `user_id`, `token_hash`, `expires_at` | Long-lived auth tokens |

### Expert-specific

| Table | Key columns | Purpose |
|-------|------------|---------|
| `experts` | `id`, `bio`, `avg_rating`, `current_lat`, `current_lng`, `status`, `is_verified`, `onboarding_status` | Expert profile + live GPS |
| `expert_services` | `expert_id`, `service_id` | Which services each expert offers |
| `expert_documents` | `expert_id`, `type`, `file_url`, `status` | KYC: AADHAAR/PAN/SELFIE |
| `expert_wallet` | `expert_id`, `balance` | Expert earnings |
| `expert_wallet_transactions` | `expert_id`, `type`, `amount`, `booking_id` | Earnings ledger |
| `withdrawal_requests` | `expert_id`, `amount`, `status` | Payout requests |

### Bookings and services

| Table | Key columns | Purpose |
|-------|------------|---------|
| `services` | `name`, `rate_per_hour`, `platform_fee_pct`, `icon_name`, `image_url`, `is_active` | Service catalogue |
| `bookings` | `customer_id`, `expert_id`, `service_id`, `status`, `lat`, `lng`, `payment_method`, `payment_status`, `total_amount` | Central transaction record |
| `booking_events` | `booking_id`, `status`, `actor`, `created_at` | Status change history (powers the timeline UI) |
| `addresses` | `customer_id`, `label`, `address_line`, `city`, `pincode`, `lat`, `lng` | Saved customer addresses |

### Payments

| Table | Key columns | Purpose |
|-------|------------|---------|
| `payments` | `booking_id`, `method`, `amount`, `status` | Final payment record |
| `payment_transactions` | `booking_id`, `provider`, `order_id`, `payment_id`, `status` | Gateway order lifecycle |
| `customer_wallet` | `customer_id`, `balance` | Customer wallet for pre-paid bookings |
| `wallet_transactions` | `customer_id`, `type`, `amount` | Wallet ledger |

### Everything else

| Table | Purpose |
|-------|---------|
| `coupons` + `coupon_usage` | Discount codes and tracking usage |
| `reviews` | Customer ratings (1–5) linked to completed bookings |
| `notifications` | In-app notification inbox |
| `support_tickets` + `ticket_messages` | Customer support threading |
| `banners` | Homepage hero carousel |
| `cms_pages` | Slug-based content pages (terms, privacy) |
| `settings` | Key-value config store (public + admin-only) |
| `cities` | City catalogue |
| `audit_logs` | Admin action trail |

### Booking Status Flow

```
SEARCHING ──► ASSIGNED ──► ACCEPTED ──► ON_THE_WAY ──► ARRIVED ──► IN_PROGRESS ──► COMPLETED
     │              │           │              │              │              │
     └──────────────┴───────────┴──────────────┴──────────────┴──────────────┴────► CANCELLED
```

| Status | Who sets it | Meaning |
|--------|------------|---------|
| `SEARCHING` | System | Looking for an expert |
| `ASSIGNED` | Dispatch service | Expert found and matched |
| `ACCEPTED` | Expert | Expert confirmed the job |
| `ON_THE_WAY` | Expert | Expert is travelling |
| `ARRIVED` | Expert | Expert is at the address |
| `IN_PROGRESS` | Expert | Service being performed |
| `COMPLETED` | Expert | Done. Wallet credited. Customer can review |
| `CANCELLED` | Customer or Admin | Cancelled. Wallet refunded if applicable |

### Payment Status Flow

```
booking created → payment_status = PENDING

CASH:    stays PENDING → expert marks COMPLETED → PAID
WALLET:  PAID immediately at booking creation (atomic debit)
ONLINE:  PENDING → customer pays on gateway → POST /payments/verify → PAID
```

---

## 8. Frontend — How It Works

### 8.1 TanStack Router

File-based routing: the file name IS the URL.

| File | URL | Note |
|------|-----|------|
| `routes/index.tsx` | `/` | Homepage |
| `routes/auth.login.tsx` | `/auth/login` | Dots → slashes |
| `routes/book.$serviceId.tsx` | `/book/:serviceId` | `$` = dynamic param |
| `routes/admin.index.tsx` | `/admin` | `index` = the route itself |

**Adding a new page** (no registration needed):
```tsx
// frontend/src/routes/experts.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/experts")({
  head: () => ({ meta: [{ title: "Our Experts — HomeHero" }] }),
  component: ExpertsPage,
});

function ExpertsPage() {
  return <div className="container mx-auto px-4 py-12">Experts list here</div>;
}
```

**Navigation:**
```tsx
import { useNavigate, Link } from "@tanstack/react-router";

const navigate = useNavigate();
navigate({ to: "/bookings" });
navigate({ to: "/track/$bookingId", params: { bookingId: "bk-123" } });

// Or use a Link component:
<Link to="/bookings">My Bookings</Link>
```

**Reading URL params:**
```tsx
// In track.$bookingId.tsx:
const { bookingId } = Route.useParams();  // "bk-123"
```

### 8.2 TanStack Query

**`useQuery` — reading server data:**
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["booking", bookingId],         // unique cache key
  queryFn: () => apiFetch(`/bookings/${bookingId}`),
  enabled: !!user,                          // only fetch when logged in
  refetchInterval: 15000,                   // poll every 15 seconds
});

if (isLoading) return <LoadingSpinner />;
if (!data) return <div>Booking not found</div>;

return <div>{data.service_name}</div>;
```

**`useMutation` — writing data:**
```tsx
const qc = useQueryClient();

const cancelBooking = useMutation({
  mutationFn: () => apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST" }),
  onSuccess: () => {
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["booking", bookingId] }); // re-fetch
  },
  onError: (e: any) => toast.error(e.message),
});

<Button onClick={() => cancelBooking.mutate()} disabled={cancelBooking.isPending}>
  {cancelBooking.isPending ? "Cancelling…" : "Cancel"}
</Button>
```

**TanStack Query v5 — no `onSuccess` in `useQuery`:**
```tsx
// WRONG (removed in v5):
useQuery({ queryFn: ..., onSuccess: (data) => setState(data) });

// CORRECT (use useEffect):
const { data } = useQuery({ queryFn: ... });
useEffect(() => {
  if (data) setState(data);  // run when data arrives
}, [data]);
```

### 8.3 Auth Context

```tsx
import { useAuth } from "@/lib/auth-context";

const { user, role, loading, signOut } = useAuth();
// user  = { id, email, role } | null
// role  = "CUSTOMER" | "EXPERT" | "ADMIN" | "SUPER_ADMIN" | null
// loading = true during first render only

// Standard route guard:
useEffect(() => {
  if (!loading && !user) navigate({ to: "/auth/login" });
}, [user, loading, navigate]);
```

### 8.4 API Client

**File: `frontend/src/lib/api.ts`**

Every API call goes through `apiFetch`. Never call `fetch` directly.

```ts
// What apiFetch does:
// 1. Adds Authorization header automatically
// 2. On 401: silently refreshes token and retries
// 3. On error: throws Error with the API's message field

const data = await apiFetch("/bookings");           // GET
const booking = await apiFetch("/bookings", {       // POST
  method: "POST",
  body: JSON.stringify({ service_id: "..." }),
});
await apiFetch(`/experts/${id}`, {                  // PATCH
  method: "PATCH",
  body: JSON.stringify({ status: "ONLINE" }),
});
```

### 8.5 Socket Client

```ts
import { getSocket, disconnectSocket } from "@/lib/socket";

// In a useEffect — always clean up:
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("subscribe_booking", bookingId);
  const onLocation = ({ lat, lng }: any) => setExpertLoc({ lat, lng });
  const onStatus   = ({ status }: any) => qc.invalidateQueries({ queryKey: ["booking", bookingId] });
  socket.on("expert_location_updated", onLocation);
  socket.on("booking_status_updated",  onStatus);

  return () => {
    socket.emit("unsubscribe_booking", bookingId);
    socket.off("expert_location_updated", onLocation);
    socket.off("booking_status_updated",  onStatus);
  };
}, [user, bookingId]);

// On logout:
disconnectSocket();
```

### 8.6 Every Page

| URL | File | Key features |
|-----|------|-------------|
| `/` | `index.tsx` | Service grid, banner carousel, FAQ, testimonials |
| `/auth/login` | `auth.login.tsx` | Email+password, auto-redirect by role |
| `/auth/signup-customer` | `auth.signup-customer.tsx` | Customer registration |
| `/auth/signup-expert` | `auth.signup-expert.tsx` | 3-step wizard: info → services → KYC |
| `/book/:serviceId` | `book.$serviceId.tsx` | Duration, type, address + "Use my location", coupon, payment |
| `/bookings` | `bookings.tsx` | Booking history with status badges |
| `/track/:bookingId` | `track.$bookingId.tsx` | Live status timeline, Leaflet GPS map |
| `/expert` | `expert.index.tsx` | Online toggle, GPS broadcast, job management |
| `/wallet` | `wallet.tsx` | Balance, top-up, transaction history |
| `/account` | `account.tsx` | Profile edit, saved addresses |
| `/notifications` | `notifications.tsx` | Inbox with unread/all tabs |
| `/support` | `support.tsx` | Submit and reply to tickets |
| `/admin` | `admin.index.tsx` | Entire admin panel |
| `/p/:slug` | `p.$slug.tsx` | Dynamic CMS pages |

### 8.7 React Hooks Rules

**Hooks must be called in the same order on every render. Never inside `if` blocks or after early `return`.**

**The most common mistake — hook AFTER early return:**

```tsx
function BookPage() {
  const { data: service, isLoading } = useQuery(...);  // hook 1
  const [coupon, setCoupon] = useState(null);           // hook 2

  if (isLoading) return <Spinner />;  // ← early return

  // ❌ WRONG: this hook is skipped when isLoading=true
  useEffect(() => {
    if (coupon) revalidate();
  }, [coupon]);
  // Error: "Rendered more hooks than during the previous render"
}
```

**Fix — move ALL hooks above early returns:**
```tsx
function BookPage() {
  const { data: service, isLoading } = useQuery(...);  // hook 1
  const [coupon, setCoupon] = useState(null);           // hook 2

  // ✅ CORRECT: hook is above the early return
  useEffect(() => {
    if (!coupon || !service) return;  // guard INSIDE the hook
    revalidate();
  }, [coupon, service]);

  if (isLoading) return <Spinner />;  // ← safe now, all hooks already called

  return <div>{service.name}</div>;
}
```

**Symptom of the bug:** "Rendered more hooks than during the previous render" — first render (loading=true) called N hooks, second render (loading=false) called N+1 hooks.

### 8.8 Tailwind and shadcn/ui

**Tailwind — one class per CSS property:**
```tsx
<div className="
  flex items-center gap-3    → flexbox with centered items and 12px gap
  rounded-2xl border bg-card → rounded corners, 1px border, card background
  p-5 shadow-sm              → 20px padding, subtle shadow
">
```

**shadcn/ui components — used throughout:**
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";  // notifications

<Button variant="outline" size="sm" onClick={save}>Save</Button>
<Input placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
toast.success("Saved!");
toast.error("Something went wrong");
```

---

## 9. End-to-End Flows

### Customer Books a Service

```
1. Homepage loads: GET /services → service grid

2. Customer clicks "Cleaning" → /book/service-id

3. Page loads:
   GET /services/:id       → rate, description
   GET /addresses          → saved addresses
   GET /wallet             → balance (for wallet payment)

4. Customer fills:
   - 3 hours, INSTANT booking
   - Address: clicks "Use my location"
     → navigator.geolocation.getCurrentPosition()
     → fetch Nominatim reverse geocode
     → fills city/pincode fields automatically
   - Payment: Online (Razorpay)

5. "Book Now" → POST /bookings {
     service_id, duration_hours: 3,
     address_snapshot: "B-12, Indira Nagar, Bengaluru",
     lat: 12.9716, lng: 77.5946,
     payment_method: "ONLINE"
   }

6. Backend:
   a. Load service → base=₹600, platform_fee=₹90, expert_amount=₹510
   b. Create booking (status: SEARCHING, payment_status: PENDING)
   c. Create Razorpay order → order_id: "order_abc"
   d. dispatchService → finds "Ravi" nearby → assigns
   e. Ravi status → BUSY
   f. Socket emit → "booking_assigned" to customer
   g. Push notification to Ravi

7. Frontend:
   → navigate to /track/bk-xyz
   → Razorpay popup opens → customer pays
   → POST /payments/verify { order_id, payment_id, signature }
   → HMAC verified → payment_status = PAID

8. Track page shows:
   Status: ASSIGNED
   Map: Ravi's GPS dot moving toward customer's pin
   ETA: ~20 min
```

### Expert Completes a Job

```
Expert dashboard (/expert):

1. Toggle ONLINE → PATCH /experts/:id { status: "ONLINE" }
2. GPS starts: socket.emit("expert_location", { lat, lng }) every 10s

3. "booking_assigned" Socket.IO event received
   → alarm rings, job card appears

4. Tap ACCEPT → PATCH /bookings/:id/status { status: "ACCEPTED" }
5. Tap ON THE WAY → { status: "ON_THE_WAY" }
   (GPS keeps broadcasting → customer sees movement on map)
6. Tap ARRIVED → { status: "ARRIVED" }
7. Tap START → { status: "IN_PROGRESS" }
8. Tap COMPLETE → { status: "COMPLETED" }
   bookingController:
   → For CASH: creates PaymentModel (method: CASH, status: PAID)
   → Credits expert wallet: ₹510
   → Expert status → ONLINE (free to take next booking)
   → Customer can now review
```

### Live Map Explained

```
1. Track page loads:
   GET /bookings/:id
   → booking.expert_lat, booking.expert_lng (Ravi's last GPS from DB)
   → if non-null: seed map immediately (no waiting)

2. Socket subscribed:
   socket.emit("subscribe_booking", bookingId)

3. Expert dashboard every 10s:
   socket.emit("expert_location", { lat: 12.9720, lng: 77.5950 })

4. Server:
   → saves to experts.current_lat = 12.9720
   → emits "expert_location_updated" to booking:bk-xyz room

5. Track page:
   socket.on("expert_location_updated", ({ lat, lng }) => setExpertLoc({ lat, lng }))

6. LiveMap component:
   → expert prop changed → moves purple circle marker
   → re-fetches OSRM route between expert and customer destination
   → draws purple road-following polyline

Map destination pin:
   → booking.lat, booking.lng stored when customer booked
   → "Use my location" button → Nominatim → populates these
```

---

## 10. How to Make Common Changes

### Add a new API endpoint

**Example: `GET /api/v1/experts/:id/reviews`**

```js
// Step 1: routes/experts.js — add the route
router.get('/:id/reviews', asyncHandler(getExpertReviews));

// Step 2: controllers/reviewController.js — add the handler
export async function getExpertReviews(req, res) {
  const { id } = req.params;
  const reviews = await ReviewModel.findForExpert(id);
  res.json({ reviews });
}

// Step 3: models/ReviewModel.js — add the DB query
async findForExpert(expertId) {
  return prisma.$queryRaw`
    SELECT r.*, p.name AS customer_name
    FROM reviews r
    LEFT JOIN profiles p ON p.id = r.customer_id
    WHERE r.expert_id = ${expertId}
    ORDER BY r.created_at DESC
  `;
},

// Step 4: frontend — call it
const { data } = useQuery({
  queryKey: ['expert-reviews', expertId],
  queryFn: () => apiFetch(`/experts/${expertId}/reviews`),
});
```

### Add a new database column

```bash
# 1. Edit backend/prisma/schema.prisma
# Add to the model: response_time_minutes  Float?

# 2. Apply:
cd backend && npm run db:migrate

# 3. Use in code:
await prisma.experts.update({ where: { id }, data: { response_time_minutes: 8.5 } });
```

### Add a new frontend page

```tsx
// frontend/src/routes/my-page.tsx — that's all you need
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page")({
  head: () => ({ meta: [{ title: "My Page — HomeHero" }] }),
  component: MyPage,
});

function MyPage() {
  return <div className="container mx-auto px-4 py-12">Hello</div>;
}
```

### Add a new admin section

In `frontend/src/routes/admin.index.tsx`:

```tsx
// 1. Add to sidebar navigation array:
{ id: "reports", label: "Reports", icon: BarChart },

// 2. Add data fetching (after all existing useQuery calls):
const { data: reportData } = useQuery({
  enabled: isAdmin && section === "reports",
  queryKey: ["admin-reports"],
  queryFn: () => apiFetch("/admin/reports"),
});

// 3. Add section content (inside the return):
{section === "reports" && (
  <div className="space-y-6">
    <h2 className="text-xl font-bold">Reports</h2>
    {/* your UI */}
  </div>
)}
```

### Add a real-time event

```js
// Backend: emit from a controller
emitToBooking(bookingId, 'eta_updated', { eta_minutes: 12 });

// Frontend: listen in a useEffect
socket.on('eta_updated', ({ eta_minutes }) => setEta(eta_minutes));
// Cleanup:
socket.off('eta_updated');
```

### Add a new notification type

```js
// Backend: call notify() from any controller
await notify(userId, {
  type: 'PROMO_OFFER',
  title: '20% off this weekend!',
  body: 'Use code SAVE20',
  bookingId: null,
});
// Frontend NotificationBell + /notifications page handle all types automatically
```

---

## 11. Admin Panel — Full Guide

The entire admin panel is in `frontend/src/routes/admin.index.tsx` — one large component.

### Access by role

| Section | Minimum role |
|---------|-------------|
| Overview, KYC, Experts, Bookings, Users, Services, Coupons, Settlements, Support | ADMIN |
| Payment Gateway settings, Platform settings, Admins, Audit Log | SUPER_ADMIN |

### Key features

**KYC Queue — three tabs:**
- **Pending review**: `onboarding_status = SUBMITTED or INCOMPLETE`
- **Rejected**: `onboarding_status = REJECTED` — shown with red border, "Re-approve" button
- **All unverified**: every unverified expert

**Manual expert assignment:**
1. Bookings section → find a SEARCHING booking
2. Amber "Assign expert" panel shows all online+verified experts
3. Click Assign — dispatch bypassed, expert directly matched

**Payment gateway config (SUPER_ADMIN only):**
1. Settings → Payment Gateway
2. Pick gateway (Razorpay/Stripe) + mode (Test/Live)
3. Enter key pair — the active pair is highlighted
4. Click Save — effective instantly, no restart

**Track any booking:**
- Overview: click "📍 Track" on any recent booking row
- Bookings table: "📍 Track" column button
- Booking detail dialog: "📍 Track live" button in header

All open `/track/:bookingId` in a new tab showing the admin view (customer info, payment info, live map, status).

---

## 12. Hosting and Deployment

### What runs on the server

| Process | Command (from `backend/`) | Port |
|---------|--------------------------|------|
| Monolith API | `node server/api.js` | 4001 |
| API Gateway | `node services/gateway/server.js` | 4000 |
| Auth service | `node services/auth-service/server.js` | 4101 |
| Payment service | `node services/payment-service/server.js` | 4102 |
| Booking service | `node services/booking-service/server.js` | 4103 |
| Frontend SSR | `node server/prod-server.js` | 4174 |

Nginx (port 443) is the only public-facing process. All Node ports stay on localhost.

### Step-by-step: deploy to a fresh Ubuntu server

**1. Server setup:**
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (Node process manager)
npm install -g pm2

# MySQL 8
sudo apt install mysql-server -y
sudo systemctl start mysql && sudo systemctl enable mysql
sudo mysql_secure_installation

# Redis
sudo apt install redis-server -y
sudo systemctl start redis-server && sudo systemctl enable redis-server

# Nginx
sudo apt install nginx certbot python3-certbot-nginx -y
```

**2. Copy code:**
```bash
git clone https://github.com/your-org/homehero-spark.git /var/www/homehero
cd /var/www/homehero
npm run install:all
```

**3. Configure environment:**
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
```env
DATABASE_URL=mysql://homehero:STRONG_PASSWORD@127.0.0.1:3306/homehero
JWT_SECRET=run: openssl rand -hex 32
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
REDIS_URL=redis://localhost:6379
PUBLIC_BACKEND_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
```

**4. Create MySQL database:**
```bash
sudo mysql -u root -p << 'SQL'
CREATE DATABASE homehero CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'homehero'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON homehero.* TO 'homehero'@'localhost';
FLUSH PRIVILEGES;
SQL
```

**5. Migrate and create admin:**
```bash
npm run db:migrate
# Do NOT run db:seed in production

cd backend && npm run create-admin
# Follow prompts to set admin email + password
```

**6. Build frontend:**
```bash
cd /var/www/homehero/frontend
echo "VITE_API_BASE=https://yourdomain.com/api/v1" > .env
npm run build
cd /var/www/homehero
```

**7. Start with PM2:**
```bash
cd /var/www/homehero/backend
pm2 start ../deploy/pm2.ecosystem.cjs
pm2 save
pm2 startup  # copy+paste the command it prints to enable auto-start on reboot
```

**8. Set up HTTPS + Nginx:**
```bash
sudo certbot --nginx -d yourdomain.com

sudo cp /var/www/homehero/deploy/nginx.conf /etc/nginx/sites-available/homehero
# Edit: replace app.homehero.com with your domain
sudo nano /etc/nginx/sites-available/homehero

sudo ln -s /etc/nginx/sites-available/homehero /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**9. Verify:**
```bash
curl https://yourdomain.com/api/v1/health
# { "status": "ok", "db": "connected" }
```

### Docker Compose alternative

```bash
cd /var/www/homehero
export JWT_SECRET=$(openssl rand -hex 32)
export DATABASE_URL=mysql://homehero:STRONG_PASSWORD@db:3306/homehero
export ALLOWED_ORIGINS=https://yourdomain.com
export NODE_ENV=production

docker compose up --build -d
docker compose exec monolith npm run db:migrate

# Logs:
docker compose logs -f
```

---

## 13. Daily Operations

### Check status and logs

```bash
pm2 status              # all processes + CPU/RAM
pm2 monit               # real-time dashboard
pm2 logs                # all logs streamed
pm2 logs monolith       # monolith only
pm2 logs monolith --lines 200  # last 200 lines
```

### Health checks

```bash
# API + DB health
curl https://yourdomain.com/api/v1/health

# Gateway routing table
curl https://yourdomain.com/gateway/health

# Test login works
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@homehero.test","password":"YourAdminPassword"}'
```

### Database backup

```bash
# Manual backup
mysqldump -u homehero -p homehero | gzip > /backups/$(date +%Y%m%d_%H%M).sql.gz

# Automated daily at 2am (add to crontab: crontab -e)
0 2 * * * mysqldump -u homehero -pPASSWORD homehero | gzip > /backups/homehero_$(date +\%Y\%m\%d).sql.gz

# Restore
gunzip < /backups/20260601.sql.gz | mysql -u homehero -p homehero
```

### Deploying an update

```bash
cd /var/www/homehero

# 1. Pull new code
git pull origin main

# 2. Install new packages (if any)
npm run install:all

# 3. Apply DB changes (safe to run anytime — only adds, never drops)
npm run db:migrate

# 4. Rebuild frontend
cd frontend && npm run build && cd ..

# 5. Reload all processes without downtime
cd backend && pm2 reload all

# 6. Verify
curl https://yourdomain.com/api/v1/health
```

### If something breaks after an update

```bash
# Roll back to previous commit
git reset --hard HEAD~1

# Rebuild and restart
npm run install:all
cd frontend && npm run build && cd ..
cd backend && pm2 reload all
```

---

## 14. Debugging Common Problems

### API returns 404

```bash
# Is the monolith running?
curl http://localhost:4001/api/v1/health

# If not: start it
pm2 start ../deploy/pm2.ecosystem.cjs

# Check the route exists
grep "your-route" backend/server/routes/*.js backend/server/api.js
```

### 401 Unauthorized

```bash
# Get a fresh token:
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@homehero.test","password":"YourPassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Use it:
curl -H "Authorization: Bearer $TOKEN" http://localhost:4001/api/v1/admin/overview
```

**If `JWT_SECRET` changed:** Everyone gets logged out. Users must log in again.

### 403 Forbidden

1. Check route uses `requireRole('ADMIN', 'SUPER_ADMIN')` not just `requireRole('ADMIN')`
2. Check controller uses `isAdmin(req.user)` not `req.user.role === 'ADMIN'`
3. Verify user's role in DB:
```bash
mysql -u homehero -p homehero -e "
  SELECT u.email, r.role 
  FROM users u JOIN user_roles r ON r.user_id = u.id 
  WHERE u.email = 'user@example.com';"
```

### Bookings stuck in SEARCHING

```bash
# Check for online experts
mysql -u homehero -p homehero -e "SELECT id, status FROM experts WHERE status = 'ONLINE';"

# Check experts offer the service
mysql -u homehero -p homehero -e "
  SELECT e.id, e.status, es.service_id
  FROM experts e JOIN expert_services es ON es.expert_id = e.id
  WHERE e.status = 'ONLINE';"

# Check dispatch logs
pm2 logs monolith 2>&1 | grep -i "dispatch\|assign"
```

### Live map not showing

Map requires: status is ASSIGNED/ON_THE_WAY/ARRIVED/IN_PROGRESS AND at least one of:
- `expertLoc` from Socket.IO (expert must be online on dashboard)
- `booking.lat + booking.lng` (set when customer used "Use my location")

```bash
# Check if booking has coordinates
mysql -u homehero -p homehero -e "SELECT id, lat, lng FROM bookings WHERE id = 'bk-xxx';"
```

### Socket.IO not connecting

Check Nginx WebSocket config:
```nginx
# /etc/nginx/sites-enabled/homehero
location /socket.io/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;    # ← required for WS
    proxy_set_header Connection "upgrade";     # ← required for WS
}
```

### Database connection refused

```bash
sudo systemctl status mysql

# Test connection (use 127.0.0.1, not localhost — Prisma on Linux prefers it)
mysql -u homehero -p -h 127.0.0.1 homehero

# Check DATABASE_URL:
grep DATABASE_URL backend/.env
```

### "Rendered more hooks than during the previous render"

A React hook is after an early `return`. Find and fix:
1. Open the component file
2. Find every early `return` (before the main JSX return)
3. Move any `useEffect`/`useState`/`useQuery` that comes after them to ABOVE them
4. Add null guards inside the hooks: `if (!service) return;`

### Payment gateway in mock mode after adding keys

1. Keys saved in Admin Panel → take effect instantly (cache busted)
2. Keys in `.env` → require restart: `pm2 reload monolith`
3. Stripe test keys: `sk_test_...` / live: `sk_live_...` — don't mix
4. Check logs: `pm2 logs monolith 2>&1 | grep -i "stripe\|razorpay\|payment"`

---

## 15. Security — What We Do and Why

| Measure | File | Why it matters |
|---------|------|----------------|
| **Helmet.js** | `api.js` global | 15 HTTP security headers. `X-Frame-Options` prevents clickjacking. `Strict-Transport-Security` enforces HTTPS |
| **CORS** | `middleware/cors.js` | Without this, any website could make API calls using a logged-in user's cookies |
| **Rate limiting** | `middleware/rateLimit.js` | Stops brute-force attacks (thousands of password guesses), spam, DoS |
| **HTML sanitization** | `middleware/sanitize.js` | Strips `<script>` from inputs. Prevents stored XSS (cross-site scripting) |
| **bcrypt passwords** | `authController.js` | Passwords hashed with salt. Leaked DB is useless — attacker must crack each hash individually |
| **Short JWT expiry (15 min)** | `auth/tokens.js` | Stolen access token becomes useless quickly |
| **Refresh token hashing** | `auth/tokens.js` | Token stored as SHA-256 hash in DB — leaked DB doesn't expose actual tokens |
| **SQL injection prevention** | All models using `Prisma.sql` | Parameterised queries — values never interpolated into SQL strings |
| **File type validation** | `routes/uploads.js` | Only images + PDF allowed. Prevents uploading executable files |
| **Role guards** | `middleware/auth.js` | Enforced server-side — frontend checks are just UX, not security |
| **HTTPS only** | Nginx + Certbot | Encrypts all traffic. Without it, JWTs can be stolen on public WiFi |

### Pre-launch security checklist

```bash
# 1. Strong JWT secret (64 hex characters = 32 bytes of entropy)
openssl rand -hex 32
# Paste into JWT_SECRET in backend/.env

# 2. NODE_ENV=production
grep NODE_ENV backend/.env

# 3. ALLOWED_ORIGINS is your domain (not localhost or *)
grep ALLOWED_ORIGINS backend/.env1

# 4. MySQL user has minimal privileges
mysql -u root -p -e "SHOW GRANTS FOR 'homehero'@'localhost';"
# Should show only: SELECT, INSERT, UPDATE, DELETE — not ALL PRIVILEGES

# 5. .env not in git
git log --all -- backend/.env    # must return nothing
cat .gitignore | grep ".env"     # must show backend/.env

# 6. HTTPS working
curl -I https://yourdomain.com | head -5
# Should show: HTTP/2 200
```

---

## 16. Quick Reference Card

### Most-used commands

```bash
# Setup (first time)
npm run install:all       # install all dependencies
npm run db:migrate        # create/update database tables
npm run db:seed           # fill with demo data (dev only)

# Development
npm run dev:all           # start everything (API + frontend)
npm run dev:backend       # API only (:4001)
npm run dev:frontend      # frontend only (:8080)

# Database
npm run db:migrate        # apply schema changes
cd backend && npm run create-admin  # create first admin user

# Production
npm run build             # build frontend
cd backend && pm2 reload all  # reload without downtime

# Testing
npm run smoke:admin       # automated admin tests
npm run smoke:flows       # booking flow tests
```

### PM2 commands (production)

```bash
pm2 status               # all processes
pm2 logs                 # all logs
pm2 logs monolith        # one service
pm2 reload all           # zero-downtime reload
pm2 restart monolith     # full restart one service
pm2 stop all             # stop everything
kill $(lsof -ti tcp:4001 -sTCP:LISTEN)  # kill monolith safely
```

### Where to find things

| Task | File |
|------|------|
| Add API endpoint | `backend/server/routes/<domain>.js` + `controllers/<domain>Controller.js` |
| Add DB table/column | `backend/prisma/schema.prisma` + `npm run db:migrate` |
| Add frontend page | `frontend/src/routes/your-page.tsx` (auto-registered) |
| Change payment logic | `backend/server/providers/paymentProvider.js` |
| Change dispatch algorithm | `backend/server/services/dispatchService.js` |
| Add real-time event | `backend/server/realtime/io.js` |
| Change booking status flow | `backend/server/controllers/bookingController.js` (NEXT_STATUS map) |
| Edit homepage | `frontend/src/routes/index.tsx` |
| Edit admin panel | `frontend/src/routes/admin.index.tsx` |
| Edit Navbar | `frontend/src/components/layout/Navbar.tsx` |
| Change notification behaviour | `backend/server/services/notificationService.js` |
| Change DB query for bookings | `backend/server/models/BookingModel.js` |

---

*Last updated: June 2026 · For admin operations see `ADMIN_GUIDE.md` · For project status see `STATUS.md`*
