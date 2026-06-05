import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

// Read at call time (not import time): dotenv may run after this module is
// imported (api.js calls dotenv.config() below its imports). authMiddleware
// verifies with process.env.JWT_SECRET at request time, so signing must resolve
// the exact same secret — a captured import-time constant would diverge.
function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

// Short-lived access token — same payload shape authMiddleware already expects.
export function signAccessToken({ user_id, email, role }) {
  return jwt.sign({ user_id, email, role }, getSecret(), { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
}

// Opaque refresh token (not a JWT, so it can never be used as an access token).
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}
