// ── payment-service ──────────────────────────────────────────────────────────
// Second domain service peeled off the monolith (strangler-fig). Owns money:
// payment gateway orders/verification, the customer prepaid wallet, and expert
// earnings/withdrawals. Reuses the monolith's route modules (shared codebase,
// shared MySQL); the gateway routes /payments, /wallet and /expert-wallet here.
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import pool from '../../server/db.js';
import { corsMiddleware } from '../../server/middleware/cors.js';
import { sanitizeBody } from '../../server/middleware/sanitize.js';
import { apiLimiter } from '../../server/middleware/rateLimit.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import paymentRoutes from '../../server/routes/payments.js';
import customerWalletRoutes from '../../server/routes/customerWallet.js';
import walletRoutes from '../../server/routes/wallet.js';

dotenv.config();

const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use(helmet());
app.use(compression());
app.use(corsMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(sanitizeBody);

app.get(`${BASE}/health`, async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'payment-service', db: 'connected' }); }
  catch { res.status(503).json({ status: 'degraded', service: 'payment-service' }); }
});

app.use(BASE, apiLimiter);

app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/wallet`, customerWalletRoutes);
app.use(`${BASE}/expert-wallet`, walletRoutes);

app.use(errorHandler);

const port = Number(process.env.PAYMENT_SERVICE_PORT || 4102);
app.listen(port, () => console.log(`payment-service listening on http://localhost:${port}${BASE}`));
