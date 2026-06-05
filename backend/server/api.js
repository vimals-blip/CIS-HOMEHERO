import dotenv from 'dotenv';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { sanitizeBody } from './middleware/sanitize.js';
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

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret')) {
  console.error('FATAL: JWT_SECRET must be set to a strong secret in production.');
  process.exit(1);
}

const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json());
app.use(sanitizeBody);

// Health check
app.get(`${BASE}/health`, async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

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
