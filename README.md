# HomeHero

On-demand home-services marketplace (Snabbit-style): customers book vetted
household experts, experts manage jobs and earnings, admins run operations.

This is a monorepo with two independent packages:

```
homehero-spark/
├── backend/     Node API — monolith (server/) + microservices (gateway, auth-service)
├── frontend/    React 19 + TanStack Start app
├── scripts/     dev-all.sh — runs the whole stack locally
└── docs/        DEVELOPER.md (setup/architecture/deploy) · USER_GUIDE.md (how to use)
```

## Quick start

Prerequisites: **Node 20+**, **MySQL 8** running locally.

```bash
# 1. Install both packages
npm run install:all

# 2. Configure env (copy the examples and fill in values)
cp backend/.env.example backend/.env       # set DB_PASSWORD, JWT_SECRET
cp frontend/.env.example frontend/.env      # VITE_API_BASE defaults to the gateway

# 3. Create the schema and seed demo data
npm run db:migrate
npm run db:seed

# 4. Run everything (gateway :4000, monolith :4001, auth-service :4101, frontend :8080)
npm run dev:all
```

Open **http://localhost:8080**. Demo logins (password `Password123`):
`exp-1@snabbit.test` (expert), `customer@snabbit.test` (customer),
`superadmin@homehero.test` (admin).

## Run pieces individually

```bash
npm run dev:backend     # monolith API only (:4001)
npm run dev:frontend    # React app only (:8080)

# inside backend/
cd backend
npm run api             # monolith        :4001
npm run auth-service    # auth-service    :4101
npm run gateway         # gateway         :4000
npm run db:backfill-experts   # repair experts missing an experts row
```

## Architecture in one picture

```
Browser ──► Gateway (:4000) ─┬─ /auth, /me ──► auth-service (:4101)
                             └─ everything else (+ Socket.IO) ──► monolith (:4001)
                                              │
                                       shared MySQL  (Redis optional)
```

The platform is migrating monolith → microservices via the **strangler-fig
pattern**: the gateway proxies not-yet-extracted routes to the monolith, so the
app stays fully working throughout. See [docs/DEVELOPER.md](docs/DEVELOPER.md).

## Documentation

- **[docs/DEVELOPER.md](docs/DEVELOPER.md)** — architecture, setup, project
  layout, environment, API surface, deployment, troubleshooting.
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — step-by-step guides for
  customers, experts, and admins.
