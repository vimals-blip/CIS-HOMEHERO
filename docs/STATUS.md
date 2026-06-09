# HomeHero — Project Status

_Last updated: 2026-06-09_

---

## ✅ Audit results (2026-06-09)

Full code + runtime audit performed. Results:

| Check | Result |
|---|---|
| TypeScript errors (frontend) | **0** |
| Backend modules load | **All OK** (paymentProvider, paymentController, bookingController, adminController) |
| Public API endpoints | **All OK** (health, services, banners, cities, auth) |
| DB table integrity | **All tables present**, 0 null-user_id notifications |
| Schema migration (STRIPE enum) | **Applied** via `prisma db push` |
| Route coverage | **34 admin routes**, payment/booking/support/notification routes all registered |
| `asyncHandler` wrappers | **All routes wrapped** — no raw unhandled-promise routes |
| `onSuccess` in `useQuery` (v5 compat) | **Fixed** — replaced with `useEffect` on query data |
| Stale `verifySignature` references | **None** — fully replaced by `verifyPayment` (async) |
| Booking-service payment path | **OK** — reuses monolith route files; Stripe changes are live |
| Payment-service gateway path | **OK** — reuses monolith route files; DB-backed config applies |

---

## ✅ Shipped in this sprint (feature batch)

### UX / Operations

1. **Booking history default tab** — changed from `"active"` (empty for customers with only completed bookings) to `"all"`. Added `isError` banner so failures surface instead of silent empty state.

2. **Support ticket filters** — status filter tabs (All / Open / In Progress / Resolved / Closed) with per-tab counts on the customer support page and the admin support section.

3. **Notification bell** (customer + admin/super-admin)
   - Shows only **unread** notifications in the dropdown
   - Auto-marks all as read 1.2 s after opening
   - Plays a short Web Audio ding on new notification arrival
   - Click navigates to `/track/BOOKING_ID` for booking events; opens a new tab for others

4. **Expert alarm** — continuous repeating alarm sound (`startBookingAlarm`) plays on the expert dashboard when a booking arrives with `status = ASSIGNED`. Stops the moment the expert accepts. Works without any audio file (Web Audio API oscillators).

5. **Admin / super-admin alarm** — same alarm rings when `recentBookings` includes any `SEARCHING` booking (no expert assigned yet). Stops when the queue clears. An amber alert banner appears with a "View bookings" button.

6. **Admin manual expert assignment**
   - Admin opens a SEARCHING booking → sees an amber "Assign expert" panel
   - Panel queries `/admin/available-experts` (online + verified experts, optionally filtered by service)
   - Clicking an expert calls `POST /admin/bookings/:id/assign`, which updates the booking, fires realtime events, and notifies both customer and expert
   - Alarm stops automatically when the booking leaves SEARCHING

7. **User list role filter** — filter bar in Admin → Users: All / Customer / Expert / Admin / Blocked. Backend `UserModel.findAll` supports `role` and `is_blocked` params.

8. **Booking status filter tabs** — full status tabs in Admin → Bookings: All / SEARCHING / ASSIGNED / ON_THE_WAY / etc.

9. **Services image management** — image upload/preview/delete in the service create/edit dialog (Admin + Super Admin). `image_url` passed through to all service forms. Delete route available to both ADMIN and SUPER_ADMIN.

10. **KYC queue separation** — three tabs in Admin → KYC: **Pending review** (SUBMITTED/INCOMPLETE), **Rejected** (REJECTED, shown in red), **All unverified**. Rejected experts get a red border + "REJECTED" badge + "Re-approve" button instead of "Reject". StatCard shows pending count with a rejected sub-line.

### Payment gateway

11. **Stripe added alongside Razorpay**
    - Backend `paymentProvider.js` fully rewritten — reads active gateway, mode, and all keys from the `settings` DB table (10 s cache; busted on save). Falls back to env vars.
    - Stripe uses Checkout Sessions (redirect flow) — no frontend card form or npm packages needed.
    - Razorpay flow unchanged (modal popup).
    - Mock mode still applies when no keys are configured.
    - `STRIPE` added to `PaymentTxnProvider` Prisma enum and pushed to DB.

12. **Super-admin payment gateway settings UI** (Admin → Settings → Payment Gateway):
    - Switch between Razorpay and Stripe with one click
    - Toggle Test / Live mode (Live shows a green "Live payments active" badge)
    - Two key boxes per gateway (TEST + LIVE) — only the active pair is highlighted
    - Save button — changes take effect **instantly**, no restart needed
    - Sensitive key fields are `type="password"` — masked in browser

13. **Customer payment flows updated**
    - Wallet top-up: Stripe → redirect to hosted checkout; on return with `?stripe_done=SESSION_ID` auto-calls verify and refreshes balance.
    - Booking (ONLINE payment): Stripe → redirect to hosted checkout; on return to `/track/BOOKING_ID?stripe_done=SESSION_ID` auto-calls verify and marks booking PAID.
    - Razorpay flows unchanged.

---

## ✅ Previously shipped (16 commits)

1. **Repo restructure + full stack** — `backend/` + `frontend/` split; `npm run dev:all`.
2. **Microservices** — payment-service + booking-service peeled off monolith (strangler-fig).
3. **Bug fixes** — SUPER_ADMIN role guard; blocked expert dispatch; dead-session redirect.
4. **Production hardening** — JWT boot guard, env-driven CORS, deploy scaffold (Caddy/PM2/Docker).
5. **Prisma ORM migration** — all 19 models, 2 controllers, 3 microservices on Prisma v5.
6. **10 marketplace features** — addresses, coupon validation, booking detail, expert KYC docs, preferred expert, live map OSRM route, invoice, analytics reports, per-service fee, service CRUD.
7. **Docs set** — README, DEVELOPER.md, DEPLOYMENT.md, ADMIN_GUIDE.md, USER_GUIDE.md, EXTRACTING_A_SERVICE.md.

---

## 🚧 Blockers (need decisions/resources, not code)

1. **No hosting / domain** — stack is deploy-ready (Docker, PM2, Caddy config), but needs a server, domain, production MySQL, and HTTPS.
2. **No real payment keys** — Razorpay and Stripe are wired and DB-configurable but run in mock mode until keys are entered in Admin → Settings → Payment Gateway.
3. **No real SMS/push credentials** — MSG91/Twilio and FCM are wired but mock without keys in `backend/.env`.

---

## 🐛 Known minor issues

- `platform_fee_pct` in the `settings` table is set to `100` (a leftover seed value). This is a CMS label for display only — the actual fee is stored per-service (all 6 services correctly at 15 %). The settings table entry can be deleted or corrected under Admin → Settings.
- Booking-service and payment-service must be **restarted** after backend code changes (same as the monolith). They share route files but run as separate processes.

---

## 📅 Next steps

- **Provision staging** — host + domain + prod MySQL + HTTPS (Caddy), deploy via PM2.
- **Enter real payment keys** in Admin → Settings → Payment Gateway. Start with Stripe TEST keys for end-to-end checkout verification.
- **Enter real SMS keys** (`MSG91_AUTH_KEY` or Twilio) in `backend/.env` to enable OTP flows.
- **Redis** (`REDIS_URL`) — enables BullMQ dispatch queue, Socket.IO multi-instance, shared cache; required for horizontal scaling.
- **Notification-service extraction** — peel notifications + Socket.IO off the monolith (last major microservice boundary).

---

## Health snapshot

| Service | Port | Status |
|---|---|---|
| Gateway | 4000 | Proxies to auth/payment/booking/monolith |
| Monolith | 4001 | Running · DB connected |
| Auth-service | 4101 | Shares monolith routes |
| Payment-service | 4102 | Shares monolith routes |
| Booking-service | 4103 | Shares monolith routes |
| Frontend | 8080 | 0 TypeScript errors |

DB row counts: users 26 · bookings 21 · notifications 113 · services 6 · support tickets 9 · audit logs 63 · payment transactions 7
