import dotenv from 'dotenv';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import prisma from './prisma.js';
import { corsMiddleware } from './middleware/cors.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initRealtime } from './realtime/io.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import serviceRoutes from './routes/services.js';
import expertRoutes from './routes/experts.js';
import addressRoutes from './routes/addresses.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';
import walletRoutes from './routes/wallet.js';
import customerWalletRoutes from './routes/customerWallet.js';
import couponRoutes from './routes/coupons.js';
import paymentRoutes from './routes/payments.js';
import supportRoutes from './routes/support.js';
import cmsRoutes from './routes/cms.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes, { UPLOAD_ROOT } from './routes/uploads.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const WEAK_SECRETS = ['dev-secret', 'change-me', 'change-this-to-a-strong-secret', 'change-me-to-a-strong-secret'];
if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || WEAK_SECRETS.includes(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be a strong (32+ char) secret in production. Generate one with: openssl rand -hex 32');
  process.exit(1);
}

const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

// Behind the gateway + nginx in production, so trust the proxy chain for
// correct req.ip (rate limiting) and protocol detection.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet());
app.use(compression());
app.use(corsMiddleware);
app.options('*', corsMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(sanitizeBody);

// Health check — exempt from rate limiting so load balancers can probe freely.
app.get(`${BASE}/health`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// Serve locally-stored uploads (KYC docs etc.) when not using S3.
// crossOriginResourcePolicy is relaxed so the frontend origin can load them.
app.use('/uploads', express.static(UPLOAD_ROOT, {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

// Broad API rate limit (after health so probes are never throttled).
app.use(BASE, apiLimiter);

// Route modules
app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}/me`, profileRoutes);
app.use(`${BASE}/services`, serviceRoutes);
app.use(`${BASE}/experts`, expertRoutes);
app.use(`${BASE}/addresses`, addressRoutes);
app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/reviews`, reviewRoutes);
app.use(`${BASE}/expert-wallet`, walletRoutes);
app.use(`${BASE}/wallet`, customerWalletRoutes);
app.use(`${BASE}/coupons`, couponRoutes);
app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/support`, supportRoutes);
app.use(`${BASE}/cms`, cmsRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/admin`, adminRoutes);
app.use(`${BASE}/uploads`, uploadRoutes);

// Global error handler — must be last
app.use(errorHandler);

const port = Number(process.env.API_PORT || process.env.PORT || 4001);

// Wrap Express in an HTTP server so Socket.IO can share the same port.
const server = http.createServer(app);
initRealtime(server);

server.listen(port, () => {
  console.log(`Snabbit API listening on http://localhost:${port}${BASE}`);
}).on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set API_PORT to another port.`);
    process.exit(1);
  }
  throw error;
});

// Graceful shutdown — stop accepting connections, drain in-flight requests,
// then close the DB pool. Lets PM2/Docker restart without dropping requests.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(0);
  });
  // Hard limit so a hung connection can't block the restart forever.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
