# HomeHero — Microservices Architecture

We are migrating the monolith to microservices using the **strangler-fig
pattern**: an API Gateway fronts everything, and we peel services off the
monolith one at a time. The gateway proxies anything not-yet-extracted to the
monolith, so the app keeps working throughout the migration.

```
                         ┌───────────────────────────┐
   Browser ───────────►  │   API Gateway  (:4000)     │
                         └─────────────┬─────────────┘
   /auth, /me            ┌──────┬──────┴───────┐  everything else (+ ws)
   /payments,            ▼      ▼              ▼
   /wallet,    auth-service  payment-service  monolith (:4001)
   /expert-wallet (:4101)    (:4102)           │
                         │      │              │
                         └──────┴──► MySQL ◄───┘   (+ Redis for cache/queue)
```

## Why this and not a big-bang rewrite
A simultaneous split of every domain would break the working app and can't be
verified incrementally. Strangler migration is reversible, always-shippable,
and lets us validate each service boundary before the next.

## Current state
- **gateway** (`services/gateway`) — single public entry; service registry +
  fallback proxy (incl. Socket.IO websocket upgrades).
- **auth-service** (`services/auth-service`) — owns `/auth/*` + `/me/*`.
  ✅ Verified: a token it mints is accepted by the monolith (shared JWT_SECRET).
- **payment-service** (`services/payment-service`) — owns `/payments/*`,
  `/wallet/*`, `/expert-wallet/*` (gateway orders/verify, customer wallet,
  expert earnings/withdrawals). ✅ Verified end-to-end through the gateway.
- **monolith** (`server/`) — still owns services, bookings, experts/KYC,
  dispatch/realtime, coupons, support, CMS, notifications, admin.

## Next services to extract (priority order)
1. **booking-service** — bookings + reviews (the core domain).
2. **dispatch/realtime-service** — Socket.IO + dispatch engine + BullMQ worker.
3. **notification-service** — notifications + FCM.

Each follows the same recipe: new `services/<name>/server.js` reusing its route
modules, add it to the gateway registry, point the prefix at it, verify.

## Run locally (without Docker)
```bash
npm run api              # monolith         :4001
npm run auth-service     # auth-service     :4101
npm run payment-service  # payment-service  :4102
npm run gateway          # gateway          :4000  (point frontend here)
npm run dev              # frontend         :8080  → VITE_API_BASE=:4000
```

## Run with Docker
```bash
docker compose up --build      # gateway published on :4000
```

## Scaling notes (the real load reducers)
Microservices enable independent scaling but do **not** by themselves reduce
load. The levers that do: Redis caching of hot reads, DB indexes, running
multiple replicas of each service behind the gateway/Nginx, BullMQ for
background work, and a CDN for static assets.

## Database
Currently a **shared MySQL** (pragmatic for incremental migration). The
long-term target is database-per-service; split schemas as each service
stabilises to remove cross-service table coupling.
