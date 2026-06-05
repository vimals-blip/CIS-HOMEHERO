// ── booking-service ──────────────────────────────────────────────────────────
// Third domain service peeled off the monolith (strangler-fig). Owns the core
// booking lifecycle and reviews. Reuses the monolith's route modules + shared
// MySQL; the gateway routes /bookings and /reviews here.
//
// Realtime note: booking mutations call emitToBooking()/notify(), which are
// best-effort and safely no-op here (this process has no Socket.IO server).
// Live *location* tracking is unaffected (handled by the monolith's socket
// connection); instant push of *status* changes falls back to the client's
// 15s poll until the Socket.IO Redis adapter is added (realtime-service step).
import dotenv from 'dotenv';
import express from 'express';
import pool from '../../server/db.js';
import { corsMiddleware } from '../../server/middleware/cors.js';
import { sanitizeBody } from '../../server/middleware/sanitize.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import bookingRoutes from '../../server/routes/bookings.js';
import reviewRoutes from '../../server/routes/reviews.js';

dotenv.config();

const BASE = process.env.API_BASE_PATH || '/api/v1';
const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(sanitizeBody);

app.get(`${BASE}/health`, async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'booking-service', db: 'connected' }); }
  catch { res.status(503).json({ status: 'degraded', service: 'booking-service' }); }
});

app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/reviews`, reviewRoutes);

app.use(errorHandler);

const port = Number(process.env.BOOKING_SERVICE_PORT || 4103);
app.listen(port, () => console.log(`booking-service listening on http://localhost:${port}${BASE}`));
