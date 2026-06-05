# HomeHero — User Guide

HomeHero connects customers with vetted home-service experts (cleaning,
cooking, dishwashing, and more). There are three kinds of users: **Customers**,
**Experts**, and **Admins**.

The app runs at **http://localhost:8080** in development. Demo accounts use the
password `Password123`.

---

## For Customers

### Create an account
1. Open the app and choose **Sign up**.
2. Pick **Customer**, enter your name, email, phone, city, and a password.
3. You're taken to the home page, signed in.

You can also sign in with **Phone OTP** from the login screen (enter your
mobile, get a 6-digit code, verify).

### Book a service
1. On the home page, choose a **city** and browse services.
2. Tap a service to see details and available experts.
3. Press **Book** and follow the steps:
   - **When** — book instantly or schedule a date/time.
   - **Where** — pick a saved address or add a new one (with pincode).
   - **Details** — duration, any notes, and an optional **coupon code**.
   - **Pay** — choose cash or your prepaid **wallet**.
4. Confirm. You'll be matched with an expert.

### Track your booking
- Go to **Bookings** to see all your jobs and their status
  (Searching → Assigned → On the way → Arrived → In progress → Completed).
- Open a live booking to **track the expert on a map** in real time and see
  arrival updates.

### Wallet
- **Wallet** shows your prepaid balance and transaction history.
- Top up to pay for bookings without cash.

### Reviews & support
- After a job completes, leave a **rating and review**.
- Need help? Open **Support**, create a ticket, and chat with the team.

### Account
- **Account** lets you update your profile, manage addresses, and log out.

---

## For Experts

### Become an expert
1. Choose **Sign up → Expert**.
2. Enter your details, experience, and the services you offer.
3. Submit. Your account is created **pending verification**.

### Get verified (KYC)
1. Log in and open your **Expert Dashboard**.
2. Under **KYC documents**, upload your **Aadhaar**, **PAN**, and a **selfie**
   (paste the document image URL).
3. An admin reviews and approves them. Until approved you'll see a
   "Verification pending" banner and won't receive jobs.

### Go online & take jobs
1. Once verified, tap **Go online** on the dashboard to start receiving jobs.
2. New jobs appear under **Active jobs**. For each job you can:
   **Accept → Start trip → Mark arrived → Start service → Complete job.**
   You can **Reject** a job before starting (it gets reassigned).
3. While online, your live location is shared with the assigned customer.

### Earnings & withdrawals
- The dashboard shows **Available balance**, **Total earned**, active jobs, and
  your rating.
- Under **Earnings**, request a **withdrawal** (minimum ₹100). Admins approve
  and mark payouts as paid.

---

## For Admins

Log in with an admin account and open the **Admin Console** (left sidebar).

| Section | What you can do |
|---------|-----------------|
| **Overview** | Revenue, bookings, customers/experts, pending KYC, charts |
| **KYC Queue** | Review expert documents; **approve / reject** experts |
| **Experts** | Search/filter experts; verify or revoke verification |
| **Bookings** | Browse all platform bookings |
| **Users** | Search users; view detail; edit profile; **block/unblock**; **reset password**; (super-admin) delete; view a user's bookings + expert earnings |
| **Services** | Create services; enable/disable them |
| **Coupons** | Create discount coupons; enable/disable |
| **Settlements** | Approve and mark expert withdrawals as paid |
| **Support** | Read and reply to customer/expert tickets; change status |
| **Settings** *(super-admin)* | Platform settings, cities, homepage banners, CMS pages (terms/privacy) |
| **Admins** *(super-admin)* | Promote users to admin / super-admin; revoke |
| **Audit Log** *(super-admin)* | Trail of sensitive actions: blocks, deletes, role changes, password resets, expert verifications, withdrawal changes |

### Approving an expert
1. Go to **KYC Queue** (or **Experts**).
2. Open the expert's documents, review each, **Approve**.
3. Click **Approve** on the expert. They can now go online and receive jobs.

### Resetting a user's password
1. **Users** → open the user → **Reset password**.
2. A one-time temporary password is shown — copy it and share it with the user
   securely. They should change it after logging in.

---

## Common questions

**I logged in but my dashboard is empty / "Could not load profile."**
Your browser may be holding an old session. Open the browser console and run
`localStorage.clear()`, reload, and log in again. If you're an expert who just
signed up, an admin must approve you first.

**An expert can't see their dashboard at all.**
Their account may be missing its expert record (older accounts). An admin/dev
can repair it with `npm run db:backfill-experts`, then approve them.
