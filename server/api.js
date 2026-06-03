import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import providerRoutes from './routes/providers.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';
import paymentRoutes from './routes/payments.js';
import walletRoutes from './routes/wallet.js';
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
app.use(`${BASE}/categories`, categoryRoutes);
app.use(`${BASE}/providers`, providerRoutes);
// Singular /provider/:id endpoint (kept for backward compat with frontend)
app.use(`${BASE}/provider`, providerRoutes);
app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/reviews`, reviewRoutes);
app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/provider-wallet`, walletRoutes);
app.use(`${BASE}/admin`, adminRoutes);

// Global error handler — must be last
app.use(errorHandler);

const port = Number(process.env.API_PORT || process.env.PORT || 4001);
app.listen(port, () => {
  console.log(`HomeHero API listening on http://localhost:${port}${BASE}`);
}).on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set API_PORT to another port.`);
    process.exit(1);
  }
  throw error;
});
