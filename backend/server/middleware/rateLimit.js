// Rate limiting — protects against brute-force, scraping, and SMS-cost abuse.
//
// Keyed on client IP. For this to be correct behind the gateway + nginx, the
// app must `app.set('trust proxy', ...)` so `req.ip` resolves to the real
// client (the gateway forwards X-Forwarded-For via `xfwd: true`).
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const json = (res, message) =>
  res.status(429).json({ error: 'RATE_LIMITED', message });

// Broad limiter for the whole API surface — generous, just catches runaway clients.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: Number(process.env.RATE_LIMIT_API ?? 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => json(res, 'Too many requests. Please slow down and try again shortly.'),
});

// Strict limiter for credential endpoints (login, signup, otp/verify) — blunts brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.RATE_LIMIT_AUTH ?? 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => json(res, 'Too many attempts. Please wait a few minutes and try again.'),
});

// OTP request limiter — the tightest, because every hit can cost a real SMS.
// Keyed on IP *and* the requested phone so neither can be hammered independently.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.RATE_LIMIT_OTP ?? 5),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const phone = String(req.body?.phone ?? '').replace(/\s+/g, '');
    return `${ipKeyGenerator(req, res)}:${phone}`;
  },
  handler: (_req, res) => json(res, 'Too many OTP requests for this number. Please wait before requesting another code.'),
});
