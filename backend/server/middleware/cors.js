import cors from 'cors';

// Env-driven CORS allow-list shared by the monolith and auth-service.
// ALLOWED_ORIGINS is a comma-separated list (e.g. "https://app.homehero.com").
// - If set: only those origins are allowed (others get no CORS headers).
// - If empty in production: deny cross-origin by default (fail safe).
// - If empty in development: reflect the request origin for convenience.
//
// Read at request time (not import time) so it's correct regardless of when
// dotenv loads — see the JWT_SECRET note in auth/tokens.js.
function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function originCheck(origin, callback) {
  // Non-browser clients (curl, server-to-server) send no Origin — always allow.
  if (!origin) return callback(null, true);
  const allowed = allowedOrigins();
  if (allowed.length === 0) return callback(null, process.env.NODE_ENV !== 'production');
  return callback(null, allowed.includes(origin));
}

export const corsMiddleware = cors({
  origin: originCheck,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
