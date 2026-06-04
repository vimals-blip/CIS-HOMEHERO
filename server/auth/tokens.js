import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
export const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

// Short-lived access token — same payload shape authMiddleware already expects.
export function signAccessToken({ user_id, email, role }) {
  return jwt.sign({ user_id, email, role }, SECRET, { expiresIn: ACCESS_TTL });
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
