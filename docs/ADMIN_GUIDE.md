# HomeHero — Admin Guide

Everything the back-office can do, who can do it, and how it's verified. The
admin console lives at **`/admin`**. After login, ADMIN and SUPER_ADMIN users
land on `/admin` automatically (customers land on home, experts on their
dashboard), and the navbar shows the admin menu.

## Roles

| Role | Can do |
|------|--------|
| **ADMIN** | All day-to-day operations: KYC, experts, bookings, users (incl. password reset), services, coupons, settlements, support. |
| **SUPER_ADMIN** | Everything an ADMIN can, **plus** platform settings, cities, banners, CMS pages, admin management, the audit log, and hard-deleting users. |

A SUPER_ADMIN is always allowed to do anything an ADMIN can (enforced by the
`isAdmin()` helper in `backend/server/middleware/auth.js`).

**Becoming an admin:** a SUPER_ADMIN promotes a user under **Admins**, or
bootstrap the first one with `cd backend && npm run create-admin`. Demo
super-admin: `superadmin@homehero.test` / `Password123`.

## Console sections

| Section | Who | What you can do | Behind it (API) |
|---------|-----|-----------------|-----------------|
| **Overview** | ADMIN | Revenue, GMV, bookings, customer/expert counts, pending-KYC, charts | `GET /admin/overview` |
| **KYC Queue** | ADMIN | Review submitted expert documents; approve/reject the expert | `PATCH /admin/experts/:id/documents/:docId`, `PATCH /experts/:id` |
| **Experts** | ADMIN | Search/filter; verify or revoke verification | `GET /admin/experts`, `PATCH /experts/:id` |
| **Bookings** | ADMIN | Browse all platform bookings | `GET /admin/bookings` |
| **Users** | ADMIN | View detail, edit profile, block/unblock, **reset password** (returns a one-time temp password), see a user's bookings + (experts) earnings | `GET /admin/users`, `GET/PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password` |
| **Users → Delete** | SUPER_ADMIN | Hard-delete a user (cascades) | `DELETE /admin/users/:id` |
| **Services** | ADMIN | Create services, enable/disable | `POST /services`, `PATCH /services/:id` |
| **Coupons** | ADMIN | Create discount coupons, enable/disable | `POST /admin/coupons`, `PATCH /admin/coupons/:id` |
| **Settlements** | ADMIN | Approve / mark-paid / reject expert withdrawals (reject refunds the balance) | `GET /admin/withdrawals`, `PATCH /admin/withdrawals/:id` |
| **Support** | ADMIN | Read tickets, reply, change status | `GET /support/tickets`, `POST /support/tickets/:id/messages`, `PATCH /support/tickets/:id/status` |
| **Settings** | SUPER_ADMIN | Edit platform settings, manage cities, homepage banners, CMS pages (terms/privacy) | `/admin/settings`, `/admin/cities`, `/admin/banners`, `/admin/pages/:slug` |
| **Admins** | SUPER_ADMIN | Promote users to ADMIN/SUPER_ADMIN; revoke | `GET /admin/admins`, `POST /admin/admins` |
| **Audit Log** | SUPER_ADMIN | Trail of sensitive actions (block, delete, role change, password reset, expert verify, withdrawal changes), filterable by action | `GET /admin/audit-logs` |

Sensitive actions are recorded to `audit_logs` automatically (actor email/role,
action, target, timestamp) — visible under **Audit Log**.

The **Users**, **Experts**, and **Bookings** lists are paginated (20 per page)
with Prev/Next controls; the backend endpoints accept `?page=&limit=`. Search
and filters reset to page 1.

## Common tasks

**Approve a new expert**
1. **KYC Queue** → open the expert's **Docs**, review each, **Approve**.
2. Click **Approve** on the expert. They can now go online. (They also get an
   in-app "You're verified" notification.)

**Reset a user's password**
1. **Users** → open the user → **Reset password** → confirm.
2. Copy the one-time temporary password shown and share it securely; the user
   changes it after logging in.

**Pay out an expert withdrawal**
1. **Settlements** → find a `REQUESTED`/`APPROVED` row → **Mark paid** (or
   **Reject**, which returns funds to the expert's balance). The expert is
   notified.

## Verifying the admin end-to-end

A smoke test exercises every admin capability (reads + mutations) through the
gateway and prints a pass/fail table:

```bash
npm run dev:all        # stack up
npm run smoke:admin    # → "30 passed, 0 failed"
```

Source: `backend/scripts/admin-smoke.mjs`. Run it after backend changes that
touch admin, roles, or the gateway. It logs in as the demo super-admin and
creates throwaway test resources (a coupon/city/banner/service/setting), so
point `BASE` at a dev/staging environment, not production.

## Troubleshooting

- **Admin screen is empty / "couldn't load"** — a dead browser session (e.g.
  after a `JWT_SECRET` change). The app now redirects to login automatically;
  if not, run `localStorage.clear()` and log in again.
- **A super-admin gets 403 on an admin action** — a role guard is missing
  SUPER_ADMIN. Use `requireRole('ADMIN','SUPER_ADMIN')` on routes and
  `isAdmin(req.user)` inside controllers (never bare `role === 'ADMIN'`).
