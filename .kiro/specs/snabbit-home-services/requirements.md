# Requirements Document

## Introduction

HomeHero is an on-demand home services marketplace modelled after Snabbit. The platform connects
customers who need household services (cleaning, plumbing, electrical, carpentry, painting, AC
repair, and more) with background-verified, trained service providers. The core promise is instant
auto-dispatch to the nearest available provider, real-time booking status updates, transparent
pricing, and a service guarantee.

This document covers all work required to bring the existing HomeHero codebase to full Snabbit
feature parity. Requirements are organized by priority:

- **P0 — Critical bugs** that break security, payments, or core booking logic.
- **P1 — Core missing features** required for a functional marketplace.
- **P2 — Growth and polish features** that complete the Snabbit experience.

Three user roles are in scope: **Customer**, **Provider**, and **Admin**.

---

## Glossary

- **System**: The HomeHero platform (React frontend + Express REST API + MySQL database).
- **Customer**: A registered user who books home services.
- **Provider**: A registered, background-verified service professional.
- **Admin**: A platform operator with elevated privileges.
- **Auth_Middleware**: The Express middleware that validates JWT tokens on protected API routes.
- **Booking**: A confirmed service request linking a Customer, Provider, and Category.
- **Category**: A type of home service (e.g., "Deep Cleaning", "Plumbing").
- **Coupon**: A discount code with type (FLAT or PERCENT), value, usage limit, and expiry.
- **Coupon_Validator**: The server-side module that validates and applies coupon discounts.
- **Dispatcher**: The System component that auto-matches a booking to an available Provider.
- **Notification_Service**: The module that sends push notifications, SMS, and in-app alerts.
- **OTP**: One-Time Password sent via SMS for phone-based authentication.
- **JWT**: JSON Web Token used for stateless API authentication.
- **Payment_Gateway**: The Razorpay integration module handling order creation and verification.
- **Payout**: A transfer of available_balance from a Provider's Wallet to their bank account.
- **Pin_Code**: A 6-digit Indian postal code used for geographic service-area matching.
- **Rate_Limiter**: The middleware that enforces request-per-window limits on sensitive endpoints.
- **Review_Aggregator**: The module that recalculates a Provider's avg_rating after each review.
- **Sanitizer**: The module that strips dangerous characters from user-supplied text inputs.
- **Subscription**: A recurring membership plan granting a fixed number of sessions per month.
- **Wallet**: A Provider's in-platform earnings ledger (pending_balance, available_balance, total_earned).
- **Wallet_Ledger**: The module that updates Provider wallet balances when booking status changes.
- **Address_Book**: The Customer's collection of saved delivery addresses.
- **Search_Engine**: The module that queries providers and categories by keyword and city.

---

## Requirements

