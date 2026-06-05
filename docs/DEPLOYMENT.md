# HomeHero — Deployment Guide

How to take HomeHero live on a single host behind one domain with HTTPS. For
local dev, see the [README](../README.md); for architecture, see
[DEVELOPER.md](DEVELOPER.md).

## Production topology

One public domain, terminated by a reverse proxy that splits traffic:

```
                         https://app.homehero.com
                                   │
                         Reverse proxy (Caddy / nginx, TLS)
              /api/*, /socket.io/* │           │ everything else
                                   ▼           ▼
                         Gateway (:4000)   Frontend SSR (:4174)
                          /   \
              auth-service(:4101)  monolith(:4001)
                              \        /
                            MySQL  (+ Redis)
```

Four Node processes run on the host (all from `backend/`, which holds their
dependencies):

| Process | Command (cwd `backend/`) | Port |
|---------|--------------------------|------|
| Monolith API | `node server/api.js` | 4001 |
| Auth service | `node services/auth-service/server.js` | 4101 |
| Gateway | `node services/gateway/server.js` | 4000 |
| Frontend SSR | `node server/prod-server.js` (serves `frontend/dist`) | 4174 |

Only the reverse proxy is exposed publicly; the four app ports stay on
localhost.

## Option A — Docker Compose (backend services)

The compose file builds and runs MySQL, Redis, and the three backend services,
publishing the gateway on :4000.

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export ALLOWED_ORIGINS=https://app.homehero.com
export DB_PASSWORD=a-strong-db-password
docker compose up --build -d
```

(`JWT_SECRET` is required — compose errors without it. `NODE_ENV` defaults to
`production`.) Then run the frontend SSR server and reverse proxy on the host
as below, and run migrations once: `docker compose exec monolith node server/migrate.js`.

## Option B — Direct (PM2)

### 1. Prerequisites
Node 20+, MySQL 8, and (recommended) Redis on the host. Install PM2:
`npm i -g pm2`.

### 2. Configure backend env
```bash
cp backend/.env.example backend/.env
# Edit backend/.env:
#   DB_* …………… production MySQL
#   JWT_SECRET …… openssl rand -hex 32   (the boot guard rejects weak secrets)
#   ALLOWED_ORIGINS=https://app.homehero.com
#   REDIS_URL=redis://localhost:6379
#   NODE_ENV=production
```

### 3. Install + migrate
```bash
npm run install:all
npm run db:migrate          # creates/updates the schema (do NOT db:seed in prod)
```

### 4. Build the frontend
Build with the **public** API base so the browser talks to your domain:
```bash
cd frontend
echo 'VITE_API_BASE=https://app.homehero.com/api/v1' > .env
npm run build               # → frontend/dist (SSR + client)
cd ..
```

### 5. Start all processes
```bash
cd backend && pm2 start ../deploy/pm2.ecosystem.cjs
pm2 save && pm2 startup     # restart on reboot
```
Check: `pm2 status`, and `curl localhost:4000/gateway/health`.

### 6. Reverse proxy + HTTPS
Pick one (configs in `deploy/`); replace `app.homehero.com` with your domain.

**Caddy (auto-HTTPS, simplest):**
```bash
caddy run --config deploy/Caddyfile
```

**nginx (TLS via certbot):**
```bash
sudo certbot --nginx -d app.homehero.com   # or supply your own certs
sudo cp deploy/nginx.conf /etc/nginx/sites-available/homehero
sudo ln -s /etc/nginx/sites-available/homehero /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Replace the stubs before real traffic

These live in `backend/server/providers/` and are no-op/console stubs — wire in
real providers (credentials via `backend/.env`):
- **SMS** (`smsProvider.js`) — OTP delivery (e.g. Twilio / MSG91).
- **Payments** (`paymentController`/provider) — real gateway (e.g. Razorpay / Stripe).
- **FCM** (`fcmProvider.js`) — push notifications.

## Post-deploy verification

```bash
curl https://app.homehero.com/api/v1/health           # {"status":"ok","db":"connected"}
curl https://app.homehero.com/gateway/health          # gateway routing table
# Open the site, sign up, book a service, confirm live tracking + notifications.
```

## Operations

- **Logs:** `pm2 logs` (or `docker compose logs -f`).
- **Health monitor:** point uptime checks at `/gateway/health` and `/api/v1/health`.
- **Backups:** schedule `mysqldump` of the `homehero` database.
- **Updates:** `git pull` → `npm run install:all` → `npm run db:migrate` →
  rebuild frontend → `pm2 reload all`.
- **Rotate `JWT_SECRET`:** changing it logs everyone out (tokens become invalid).
