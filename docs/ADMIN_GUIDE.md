# HomeHero — Admin Guide

Everything the back-office can do, who can do it, and how it's verified. The
admin console lives at **`/admin`**. After login, ADMIN and SUPER_ADMIN users
land on `/admin` automatically (customers land on home, experts on their
dashboard), and the navbar shows the admin menu.

## Roles

| Role | Can do |
|------|--------|
| **ADMIN** | All day-to-day operations: KYC, experts, bookings, users (incl. password reset), services (incl. image upload/delete), coupons, settlements, support. |
| **SUPER_ADMIN** | Everything an ADMIN can, **plus** payment gateway config, platform settings, cities, banners, CMS pages, admin management, the audit log, and hard-deleting users. |

A SUPER_ADMIN is always allowed to do anything an ADMIN can (enforced by the
`isAdmin()` helper in `backend/server/middleware/auth.js`).

**Becoming an admin:** a SUPER_ADMIN promotes a user under **Admins**, or
bootstrap the first one with `cd backend && npm run create-admin`. Demo
super-admin: `superadmin@homehero.test` / `Password123`.

---

## Console sections

| Section | Who | What you can do | Behind it (API) |
|---------|-----|-----------------|-----------------|
| **Overview** | ADMIN | Revenue, GMV, bookings, customer/expert counts, pending-KYC stat, charts. Alarm rings + amber banner when bookings are stuck in SEARCHING (no expert yet). | `GET /admin/overview` (polls every 15 s) |
| **KYC Queue** | ADMIN | Three tabs: **Pending review** (SUBMITTED/INCOMPLETE), **Rejected** (red badge), **All unverified**. Review docs, approve, or reject. Rejected experts can be re-approved. | `PATCH /admin/experts/:id/documents/:docId`, `PATCH /experts/:id` |
| **Experts** | ADMIN | Search / filter by status + verification; verify or revoke; delete (SUPER_ADMIN) | `GET /admin/experts`, `PATCH /experts/:id` |
| **Bookings** | ADMIN | Full status filter tabs (All / SEARCHING / ASSIGNED / ON_THE_WAY / ARRIVED / IN_PROGRESS / COMPLETED / CANCELLED). **Manual expert assignment**: open a SEARCHING booking → pick from available online+verified experts → assign. Admin alarm rings for SEARCHING bookings. | `GET /admin/bookings`, `POST /admin/bookings/:id/assign`, `GET /admin/available-experts` |
| **Users** | ADMIN | Role filter tabs (All / Customer / Expert / Admin / Blocked). View detail, edit profile, block/unblock, **reset password**, see bookings + earnings. | `GET /admin/users`, `GET/PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password` |
| **Users → Delete** | SUPER_ADMIN | Hard-delete a user (cascades) | `DELETE /admin/users/:id` |
| **Services** | ADMIN + SUPER_ADMIN | Create / edit / delete services. Image upload with preview (stored via `uploadFile`). Per-service platform fee. | `POST/PATCH/DELETE /services` |
| **Coupons** | ADMIN | Create discount coupons (flat / percent), enable/disable | `POST /admin/coupons`, `PATCH /admin/coupons/:id` |
| **Settlements** | ADMIN | Approve / mark-paid / reject expert withdrawals (reject refunds the balance) | `GET /admin/withdrawals`, `PATCH /admin/withdrawals/:id` |
| **Support** | ADMIN | Status filter tabs (All / Open / In Progress / Resolved / Closed). Read tickets, reply, change status. | `GET /support/tickets`, `POST /support/tickets/:id/messages`, `PATCH /support/tickets/:id/status` |
| **Settings → Payment Gateway** | SUPER_ADMIN | Switch active gateway (Razorpay / Stripe), toggle Test / Live mode, enter keys for all four combos. Changes apply instantly — no restart needed. | `GET/POST /admin/payment-config` |
| **Settings → Platform** | SUPER_ADMIN | Edit platform settings, manage cities, homepage banners, CMS pages (terms/privacy) | `/admin/settings`, `/admin/cities`, `/admin/banners`, `/admin/pages/:slug` |
| **Admins** | SUPER_ADMIN | Promote users to ADMIN/SUPER_ADMIN; revoke | `GET /admin/admins`, `POST /admin/admins` |
| **Audit Log** | SUPER_ADMIN | Trail of sensitive actions (block, delete, role change, password reset, expert verify, withdrawal changes), filterable by action | `GET /admin/audit-logs` |

Sensitive actions are recorded to `audit_logs` automatically (actor email/role,
action, target, timestamp) — visible under **Audit Log**.

**Blocking** an account (Users → Block) immediately: prevents login (403
`ACCOUNT_BLOCKED`), and for experts also takes them **offline** and excludes
them from auto-dispatch and customer listings — so a blocked expert can no
longer receive or be assigned bookings. Unblocking reverses it (the expert
must go online again).

The **Users**, **Experts**, and **Bookings** lists are paginated (20 per page)
with Prev/Next controls; the backend endpoints accept `?page=&limit=`. Search
and filters reset to page 1.

---

## Common tasks

**Approve a new expert**
1. **KYC Queue** → Pending review tab → open the expert's **Docs**, review each document.
2. Click **Approve** on the expert. They can now go online and receive bookings.
   (They also get an in-app "You're verified" notification.)

**Manually assign an expert to a stuck booking**
1. **Bookings** → filter SEARCHING → open the booking.
2. An amber "Assign expert" panel lists all online + verified experts.
3. Click **Assign** next to an expert. The alarm stops, customer and expert are notified.

**Configure payment gateway**
1. **Settings → Payment Gateway** (SUPER_ADMIN only).
2. Pick **Razorpay** or **Stripe**, pick **Test** or **Live** mode.
3. Enter the corresponding key pair (the active pair is highlighted).
4. Click **Save gateway settings** — effective immediately.

For Stripe, the _Publishable Key_ (pk_...) and _Secret Key_ (sk_...) both need to be set. The success/cancel redirect URLs are auto-built using `FRONTEND_URL` env var (default `http://localhost:5173`).

**Reset a user's password**
1. **Users** → open the user → **Reset password** → confirm.
2. Copy the one-time temporary password shown and share it securely.

**Pay out an expert withdrawal**
1. **Settlements** → find a `REQUESTED`/`APPROVED` row → **Mark paid** (or
   **Reject**, which returns funds to the expert's balance). The expert is
   notified.

---

## Notification sounds

The admin panel plays sounds for two events:

| Event | Sound | Stops when |
|---|---|---|
| New unread notification arrives | Single two-tone ding (Web Audio API) | Notification bell is opened |
| Booking stuck in SEARCHING | Repeating 3-beep alarm | Booking leaves SEARCHING (expert assigned or cancelled) |

Sounds use the browser Web Audio API — no audio files required.

---

## Verifying the admin end-to-end

A smoke test exercises every admin capability (reads + mutations) through the
gateway and prints a pass/fail table:

```bash
npm run dev:all        # stack up
npm run smoke:admin    # → "30 passed, 0 failed"
```

Source: `backend/scripts/admin-smoke.mjs`. Run it after backend changes that
touch admin, roles, or the gateway. It logs in as the demo super-admin and
creates throwaway test resources, so point `BASE` at a dev/staging environment,
not production.

---

## Troubleshooting

- **Admin screen is empty / "couldn't load"** — a dead browser session (e.g.
  after a `JWT_SECRET` change). The app now redirects to login automatically;
  if not, run `localStorage.clear()` and log in again.
- **A super-admin gets 403 on an admin action** — a role guard is missing
  SUPER_ADMIN. Use `requireRole('ADMIN','SUPER_ADMIN')` on routes and
  `isAdmin(req.user)` inside controllers (never bare `role === 'ADMIN'`).
- **Payment gateway shows "Stripe checkout creation failed"** — the Stripe secret
  key in Settings is wrong or the mode (TEST/LIVE) doesn't match the key prefix.
  Stripe test keys start with `sk_test_`; live keys start with `sk_live_`.
- **KYC Queue is empty but experts exist** — all experts are either `is_verified=1`
  (already approved) or the filter tab is wrong. Check the "All unverified" tab.
