# HomeHero — Project Status

_Last updated: 2026-06-05_

## ✅ Shipped today (16 commits)

1. **Repo restructure + full stack** — split into `backend/` + `frontend/`
   packages (separate deps, env, Dockerfile); the whole microservice stack runs
   through the gateway and is verified end-to-end (`npm run dev:all`).
2. **2 more microservices extracted** (strangler-fig) — **payment-service**
   (`/payments`, `/wallet`, `/expert-wallet`) and **booking-service**
   (`/bookings`, `/reviews`). Now 3 domain services + gateway, all verified.
3. **Real bug fixes** — SUPER_ADMIN was treated as a customer (frontend +
   backend role guards); dead sessions showed a broken dashboard (now redirect
   to login); **blocked experts still got auto-assigned bookings** (dispatch now
   excludes blocked experts and takes them offline).
4. **Production hardening + providers** — strong `JWT_SECRET` with a boot guard,
   env-driven CORS allow-list, real SMS (MSG91/Twilio) + Razorpay + FCM made
   credential-ready, deploy scaffold (Caddy/nginx/PM2).
5. **Quality + verification** — admin smoke test (30/30) and customer/expert
   smoke test (19/19), admin list pagination, dead Supabase code removed, full
   docs set (README, DEVELOPER, DEPLOYMENT, ADMIN_GUIDE, USER_GUIDE,
   EXTRACTING_A_SERVICE).

## 🚧 Blockers (need decisions/resources, not code)

1. **No hosting / domain provisioned** — the code is deploy-ready (Docker, PM2,
   reverse-proxy configs), but going live publicly needs a server, a domain,
   production MySQL, and HTTPS.
2. **No real provider credentials** — payments (Razorpay), SMS (MSG91/Twilio),
   and push (FCM) are wired but run in mock/fallback mode until API keys are
   added to `backend/.env`.

## 📅 Next week plan

- **Mon–Tue** — Extract **realtime/dispatch-service** with a Socket.IO Redis
  adapter (also removes the "booking status push falls back to 15s poll"
  caveat from booking-service).
- **Tue–Wed** — Expert onboarding fix: prompt an online expert who has **no
  services** to add them, plus a "why am I not getting jobs" hint, so new
  experts actually receive bookings.
- **Wed–Thu** — Provision **staging** (host + domain + prod MySQL + HTTPS via
  Caddy), deploy the stack, wire **real provider keys**, run the smoke suites
  against staging.
- **Thu–Fri** — Extract the last service (**notification-service**); UAT pass
  across all three roles; go/no-go review against the launch checklist in
  [DEPLOYMENT.md](DEPLOYMENT.md).
- **Stretch** — 1-model **Drizzle** POC (only if we later move the backend to
  TypeScript; not required for launch — `mysql2` raw SQL stays the fast default).

## Health snapshot

- Services: gateway :4000 · monolith :4001 · auth :4101 · payment :4102 ·
  booking :4103 · frontend :8080
- Tests: `npm run smoke:admin` → 30/30 · `npm run smoke:flows` → 19/19
- Build: frontend production build green.
