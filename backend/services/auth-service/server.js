// ── auth-service ─────────────────────────────────────────────────────────────
// Standalone microservice owning authentication + profile/account.
// Reuses the existing route modules from the monolith (shared codebase,
// shared MySQL) — the first service peeled off via the strangler pattern.
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import prisma from '../../server/prisma.js';
import { corsMiddleware } from '../../server/middleware/cors.js';
import { sanitizeBody } from '../../server/middleware/sanitize.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import authRoutes from '../../server/routes/auth.js';
import profileRoutes from '../../server/routes/profile.js';

dotenv.config();

const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

// Trust the gateway/nginx proxy chain so req.ip is the real client (the
// auth rate limiters in routes/auth.js key on it).
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet());
app.use(compression());
app.use(corsMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(sanitizeBody);

app.get(`${BASE}/health`, async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'auth-service', db: 'connected' }); }
  catch { res.status(503).json({ status: 'degraded', service: 'auth-service' }); }
});

app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}/me`, profileRoutes);

app.use(errorHandler);

const port = Number(process.env.AUTH_SERVICE_PORT || 4101);
app.listen(port, () => console.log(`auth-service listening on http://localhost:${port}${BASE}`));
