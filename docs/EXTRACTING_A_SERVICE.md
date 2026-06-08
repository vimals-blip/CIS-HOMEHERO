# Playbook: Extracting a Service from the Monolith

How we peel a domain off the monolith into its own microservice using the
**strangler-fig** pattern — the exact, repeatable recipe used for
`auth-service` and `payment-service`. Follow it for the next ones
(booking → dispatch/realtime → notification).

## The idea in one line

Run the **same route modules** as a **separate process** behind the gateway,
then point that path prefix at it. No rewrite, shared MySQL, zero downtime —
the gateway proxies anything not-yet-extracted to the monolith, so the app
keeps working throughout.

```
Browser → Gateway :4000 ─┬─ /auth,/me            → auth-service    :4101
                         ├─ /payments,/wallet…   → payment-service :4102
                         └─ everything else (+ws) → monolith        :4001
                                       shared MySQL (+ Redis)
```

## Principles (don't break these)

- **Reuse, don't rewrite.** The new service imports the monolith's existing
  `routes/`, `controllers/`, `models/` from `../../server/`. One source of truth.
- **Stateless JWT.** Every service signs/verifies with the same `JWT_SECRET`, so
  a token minted anywhere is accepted everywhere. Read secrets/config **at
  request time**, never into an import-time constant (see `auth/tokens.js` and
  `middleware/cors.js` — dotenv loads after imports).
- **Gateway order matters.** The registry is matched top-down; list more
  specific prefixes before less specific ones.
- **Realtime stays put (for now).** Socket.IO lives in the monolith; the gateway
  proxies websocket upgrades there. A service that calls `notify()` is fine —
  it's best-effort and won't error if it can't reach the socket.

## The recipe

Pick a target: a domain with a clean boundary (its own routes/tables, few
cross-calls). Example below uses a placeholder `widget-service` owning
`/widgets`; substitute your real domain (next up: `booking-service` owning
`/bookings` + `/reviews`).

### 1. Create the service entry point

`backend/services/<name>-service/server.js` — copy `auth-service/server.js` and
swap the mounted routes. Template:

```js
import dotenv from 'dotenv';
import express from 'express';
import prisma from '../../server/prisma.js';
import { corsMiddleware } from '../../server/middleware/cors.js';
import { sanitizeBody } from '../../server/middleware/sanitize.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import widgetRoutes from '../../server/routes/widgets.js';   // ← the domain's routes

dotenv.config();
const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(sanitizeBody);

app.get(`${BASE}/health`, async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'widget-service', db: 'connected' }); }
  catch { res.status(503).json({ status: 'degraded', service: 'widget-service' }); }
});

app.use(`${BASE}/widgets`, widgetRoutes);   // ← mount every prefix this service owns

app.use(errorHandler);
const port = Number(process.env.WIDGET_SERVICE_PORT || 4103);
app.listen(port, () => console.log(`widget-service listening on http://localhost:${port}${BASE}`));
```

Pick the next free port (auth 4101, payment 4102 → next 4103).

### 2. Register it in the gateway

`backend/services/gateway/server.js`:

```js
const WIDGET_SERVICE = process.env.WIDGET_SERVICE_URL || 'http://localhost:4103';
// …in the ROUTES array (most specific first):
{ prefix: `${BASE}/widgets`, target: WIDGET_SERVICE, name: 'widget-service' },
```

The gateway's fallback still sends everything else to the monolith, so the
moment you add the route, that prefix is served by the new process.

### 3. Wire config (5 places)

| File | Add |
|------|-----|
| `backend/package.json` | `"widget-service": "node services/widget-service/server.js"` |
| `scripts/dev-all.sh` | a `pkill` line, a start block (`cd "$ROOT/backend" && node services/widget-service/server.js`), and the health-check entry |
| `backend/.env` + `.env.example` | `WIDGET_SERVICE_PORT=4103` and `WIDGET_SERVICE_URL=http://localhost:4103` |
| `docker-compose.yml` | a `widget-service` block (copy `payment-service`), add `WIDGET_SERVICE_URL` + `depends_on` to the `gateway` |
| `deploy/pm2.ecosystem.cjs` | a process entry with `WIDGET_SERVICE_PORT` |

### 4. Verify end-to-end

```bash
npm run dev:all
# gateway knows about it:
curl -s localhost:4000/gateway/health        # widget-service should appear in routes
# the service answers directly:
curl -s localhost:4103/api/v1/health         # {"status":"ok","service":"widget-service"}
# and through the gateway with a real token:
TOK=$(curl -s -X POST localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"customer@snabbit.test","password":"Password123"}' | grep -o '"accessToken":"[^"]*"')
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer ${TOK#*:\"}" localhost:4000/api/v1/widgets
```
Expect the same status codes you got before extraction — the only thing that
changed is *which process* served the request.

### 5. Update the docs (same edit, every time)

Keep these in lockstep so the topology stays accurate:
- `backend/services/README.md` — current state, diagram, run commands, next-up.
- `docs/DEVELOPER.md` — folder layout, ports list, extracted-vs-monolith.
- `docs/DEPLOYMENT.md` — topology diagram + process table.

### 6. Commit

One commit per service: the new service + gateway registration + the 5 config
wirings + doc updates. Reference the verified status codes in the message.

## What does NOT change

- **Database** — still one shared MySQL. (Splitting schemas per service is a
  later, separate step once a service's tables are truly independent.)
- **Frontend** — only ever talks to the gateway (`:4000`), so extractions are
  invisible to it. No frontend change needed.
- **Auth** — the shared `JWT_SECRET` means the new service authenticates
  requests with the same `authMiddleware`, no new login flow.

## Done so far / next

- ✅ `auth-service` — `/auth`, `/me`
- ✅ `payment-service` — `/payments`, `/wallet`, `/expert-wallet`
- ✅ `booking-service` — `/bookings`, `/reviews` (realtime emits no-op here →
      ≤15s poll fallback for status push until the Redis adapter lands)
- ⏭️ `dispatch/realtime-service` — Socket.IO + dispatch + BullMQ worker
      (the one that needs care — add a Socket.IO Redis adapter so any process
      can push events, then move the realtime init)
- ⏭️ `notification-service` — `/notifications` + FCM
