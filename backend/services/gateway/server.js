// ── API Gateway ──────────────────────────────────────────────────────────────
// Single public entry point. Routes each path prefix to the service that owns
// it; anything not yet extracted falls through to the monolith. This is what
// lets us migrate to microservices incrementally without downtime.
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const BASE = process.env.API_BASE_PATH || '/api/v1';
const PORT = Number(process.env.GATEWAY_PORT || 4000);

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:4101';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4102';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4103';
const MONOLITH = process.env.MONOLITH_URL || 'http://localhost:4001';

const app = express();

// Public edge: trust nginx in front, set baseline security headers.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use(helmet());

// Service registry: prefix → target. Order matters (most specific first).
const ROUTES = [
  { prefix: `${BASE}/auth`,          target: AUTH_SERVICE,    name: 'auth-service' },
  { prefix: `${BASE}/me`,            target: AUTH_SERVICE,    name: 'auth-service' },
  { prefix: `${BASE}/payments`,      target: PAYMENT_SERVICE, name: 'payment-service' },
  { prefix: `${BASE}/expert-wallet`, target: PAYMENT_SERVICE, name: 'payment-service' },
  { prefix: `${BASE}/wallet`,        target: PAYMENT_SERVICE, name: 'payment-service' },
  { prefix: `${BASE}/bookings`,      target: BOOKING_SERVICE, name: 'booking-service' },
  { prefix: `${BASE}/reviews`,       target: BOOKING_SERVICE, name: 'booking-service' },
];

app.get('/gateway/health', (_req, res) => {
  res.json({ status: 'ok', gateway: true, routes: ROUTES.map((r) => ({ prefix: r.prefix, service: r.name })), fallback: MONOLITH });
});

for (const { prefix, target } of ROUTES) {
  // xfwd: forward X-Forwarded-For so downstream services see the real client IP
  // (required for their rate limiting to key per-user, not per-gateway).
  app.use(prefix, createProxyMiddleware({ target, changeOrigin: true, xfwd: true, pathRewrite: (p, req) => req.originalUrl }));
}

// Fallback: everything else (booking, payments, services, realtime ws…) → monolith.
const fallback = createProxyMiddleware({
  target: MONOLITH,
  changeOrigin: true,
  xfwd: true,
  ws: true, // proxy Socket.IO websocket upgrades
  pathRewrite: (p, req) => req.originalUrl,
});
app.use('/', fallback);

const server = app.listen(PORT, () => {
  console.log(`API Gateway on http://localhost:${PORT}`);
  console.log(`  ${BASE}/auth, ${BASE}/me  → ${AUTH_SERVICE}`);
  console.log(`  everything else (+ws)     → ${MONOLITH}`);
});
// Forward websocket upgrades to the monolith (Socket.IO).
server.on('upgrade', fallback.upgrade);
