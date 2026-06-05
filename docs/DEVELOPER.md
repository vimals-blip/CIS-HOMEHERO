# HomeHero — Developer Guide

## 1. Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start (SSR) + Router, TanStack Query, Tailwind CSS v4, Radix UI, Recharts, Leaflet, Sonner |
| Backend | Node 20 (ESM), Express, MySQL 8 (`mysql2`), JWT auth (`jsonwebtoken`), Socket.IO, BullMQ + Redis (optional) |
| Gateway | Express + `http-proxy-middleware` |
| Tooling | Vite 7, TypeScript, ESLint, Prettier |

## 2. Repository layout

```
homehero-spark/
├── package.json            root orchestrator (install:all, dev:all, db:*)
├── scripts/dev-all.sh      starts monolith + auth-service + gateway + frontend
├── docker-compose.yml      mysql + redis + 3 backend services
├── docs/
│
├── backend/
│   ├── package.json        backend deps + scripts
│   ├── .env                DB creds, JWT_SECRET, ports, service URLs
│   ├── Dockerfile          one image, command overridden per service
│   ├── server/             the MONOLITH
│   │   ├── api.js          Express app + route mounts (:4001)
│   │   ├── prod-server.js  production SSR server (serves frontend/dist)
│   │   ├── db.js           MySQL pool
│   │   ├── routes/         one file per domain (auth, bookings, experts, …)
│   │   ├── controllers/    request handlers
│   │   ├── models/         SQL data access
│   │   ├── middleware/     auth, sanitize, errorHandler
│   │   ├── realtime/       Socket.IO (live tracking, dispatch)
│   │   ├── queues/         BullMQ dispatch (in-process fallback w/o Redis)
│   │   ├── schema.sql      full DB schema
│   │   ├── migrate.js      apply schema.sql
│   │   ├── seed.js         demo data
│   │   └── backfillExperts.js   repair script (see §7)
│   └── services/
│       ├── gateway/        public entry (:4000), routes by prefix
│       └── auth-service/   owns /auth + /me (:4101), reuses server/ modules
│
└── frontend/
    ├── package.json        frontend deps + scripts
    ├── .env                VITE_API_BASE, VITE_SUPABASE_*
    ├── .npmrc              legacy-peer-deps=true (Lovable/nitro peer range)
    ├── vite.config.ts      @lovable.dev/vite-tanstack-config preset
    ├── tsconfig.json       @/* → ./src/*
    └── src/
        ├── routes/         file-based pages (TanStack Router)
        ├── components/     UI + feature components
        └── lib/            api client, auth context, socket, utils
```

## 3. Local setup

Prerequisites: Node 20+, MySQL 8 running and reachable with the creds in
`backend/.env`.

```bash
npm run install:all                         # installs backend + frontend
cp backend/.env.example backend/.env        # then edit DB_PASSWORD, JWT_SECRET
cp frontend/.env.example frontend/.env
npm run db:migrate                           # create schema
npm run db:seed                              # demo data (optional)
npm run dev:all                              # run the full stack
```

Ports: gateway **:4000** (public), monolith **:4001**, auth-service **:4101**,
frontend **:8080**. Logs from `dev:all` go to `/tmp/homehero-logs/`.

## 4. Environment variables

**backend/.env**

| Var | Purpose |
|-----|---------|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL connection |
| `DATABASE_URL` | optional connection-string alternative |
| `JWT_SECRET` | **must** be a long random string in production |
| `API_PORT` `AUTH_SERVICE_PORT` `GATEWAY_PORT` | service ports |
| `AUTH_SERVICE_URL` `MONOLITH_URL` | gateway proxy targets |
| `REDIS_URL` | optional — enables BullMQ dispatch + caching |

**frontend/.env**

| Var | Purpose |
|-----|---------|
| `VITE_API_BASE` | API base; `:4000` (gateway) or `:4001` (monolith direct) |

> Only `VITE_*` vars are exposed to the browser. Never put secrets in
> `frontend/.env`.

## 5. Architecture & the migration

Strangler-fig: a single **gateway** is the public entry. It routes each path
prefix to the owning service and proxies everything else (plus Socket.IO
websockets) to the **monolith**. Services are peeled off one at a time without
downtime.

- **Extracted:** `auth-service` (owns `/auth/*`, `/me/*`).
- **Still in the monolith:** services, bookings, experts, wallets, coupons,
  payments, support, CMS, notifications, admin, realtime/dispatch.
- **Next candidates (priority):** payment → booking → dispatch/realtime →
  notification.

Auth is **stateless JWT**: any service mints tokens with `JWT_SECRET` and any
service verifies with the same secret, so a token from the auth-service is
accepted by the monolith. The secret is read at request time (not import time)
to avoid dotenv ordering bugs — keep it that way.

## 6. API surface (mounted under `/api/v1`)

| Prefix | Domain |
|--------|--------|
| `/auth` | login, signup, OTP, token refresh |
| `/me` | current user's profile/account |
| `/services` | service catalog |
| `/experts` | expert profiles, status, KYC documents |
| `/addresses` | customer saved addresses |
| `/bookings` | create/track/advance/cancel bookings |
| `/reviews` | ratings & reviews |
| `/expert-wallet` | expert earnings, withdrawals, earnings history |
| `/wallet` | customer prepaid wallet |
| `/coupons` | coupon validation |
| `/payments` | payment records |
| `/support` | support tickets + threads |
| `/cms` | public CMS pages (terms, privacy) |
| `/notifications` | user notifications, device tokens |
| `/admin` | overview, users, experts/KYC, bookings, coupons, settlements, settings, audit log |

All state-changing and account routes require a `Bearer` token
(`authMiddleware`); admin routes require `ADMIN`/`SUPER_ADMIN` via
`requireRole`.

## 7. Database

- Schema: `backend/server/schema.sql`. Apply with `npm run db:migrate`.
- Demo data: `npm run db:seed` (idempotent upserts; recreates demo experts
  `exp-1`…`exp-4` only).
- **`npm run db:backfill-experts`** — every `EXPERT`-role user must have a row
  in `experts` (+ `expert_wallet`), or `GET /experts/:id` 404s and their
  dashboard breaks. New signups stay consistent transactionally; run this to
  repair older accounts, e.g. after re-seeding.

## 8. Deployment

**Docker (all backend services + MySQL + Redis):**

```bash
docker compose up --build       # gateway published on :4000
```

**Manual / PaaS:**

1. Backend: run `node server/api.js`, `node services/auth-service/server.js`,
   `node services/gateway/server.js` (separate processes/containers). Set
   `backend/.env` (real `JWT_SECRET`, prod DB, `REDIS_URL`).
2. Frontend: `cd frontend && npm run build`. Serve the build (the bundled SSR
   server, or `backend/server/prod-server.js` which serves `frontend/dist`).
   Set `VITE_API_BASE` to the public gateway URL at build time.
3. Put the gateway behind HTTPS (nginx/Caddy/cloud LB). Only the gateway needs
   to be public.

See the launch checklist in §10.

## 9. Troubleshooting

- **"Could not load your expert profile" / 404 on `/experts/:id`** — that
  EXPERT user has no `experts` row. Run `npm run db:backfill-experts`.
- **All authenticated calls return 401** — `JWT_SECRET` mismatch between
  signer and verifier. Ensure every backend process loads the same
  `backend/.env`, and that secrets are read at call time.
- **Admin/expert screen shows nothing after a deploy** — stale token in the
  browser. `localStorage.clear()` and log in again.
- **`npm install` fails in frontend with a `nitro` peer error** — that's why
  `frontend/.npmrc` sets `legacy-peer-deps=true`; install from `frontend/`.

## 10. Production launch checklist

Enforced in code (set `NODE_ENV=production`):
- **`JWT_SECRET`** — the API refuses to boot in production with a missing/weak
  (<32 char) secret. Generate with `openssl rand -hex 32`. A strong dev secret
  already lives in `backend/.env`; rotate it for prod.
- **CORS** — driven by `ALLOWED_ORIGINS` (comma-separated). Set it to your real
  frontend origin(s), e.g. `https://app.homehero.com`. Empty in production =
  cross-origin blocked. Applied on both the monolith and auth-service.

Still operational / infra (you provide these):
- [ ] Production MySQL with backups; run `db:migrate` (not `db:seed`).
- [ ] Serve everything over HTTPS; only expose the gateway (nginx/Caddy/LB).
- [ ] Build the frontend with `VITE_API_BASE` = your public gateway URL.
- [ ] Set `REDIS_URL` so dispatch/queues run out-of-process.
- [ ] Replace the SMS / payment / FCM stubs (`backend/server/providers/`) with
      real providers + credentials.
- [ ] Configure log shipping + a health/uptime monitor on `/gateway/health`.

`docker compose up --build` requires `JWT_SECRET` to be set (it errors
otherwise) and defaults `NODE_ENV=production`; pass `ALLOWED_ORIGINS` too.
