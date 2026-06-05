import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { AuthModel } from '../models/AuthModel.js';
import { BadRequest, Conflict, HttpError } from '../errors.js';
import { signAccessToken, generateRefreshToken, hashToken, refreshExpiryDate } from '../auth/tokens.js';
import { smsProvider, devOtp } from '../providers/smsProvider.js';

const VALID_ROLES = ['CUSTOMER', 'EXPERT', 'ADMIN'];
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Issue an access + refresh token pair and persist the (hashed) refresh token.
async function issueTokens(user) {
  const accessToken = signAccessToken({ user_id: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken();
  await AuthModel.saveRefreshToken(user.id, hashToken(refreshToken), refreshExpiryDate());
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}

function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export const authController = {
  async signup(req, res) {
    const {
      email, password,
      name = null, phone = null, role = 'CUSTOMER', city = null,
      gender = 'FEMALE', bio = null, experience_years = null,
      service_ids = [], service_pincodes = [],
    } = req.body;

    if (!email || !password) throw BadRequest('MISSING_FIELDS', 'Email and password are required.');
    if (password.length < 6) throw BadRequest('WEAK_PASSWORD', 'Password must be at least 6 characters.');
    if (!VALID_ROLES.includes(role)) throw BadRequest('INVALID_ROLE', 'Invalid role.');

    if (await AuthModel.emailExists(email)) {
      throw Conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Atomic so an expert is never left with the role but no expert/wallet row.
    const conn = await pool.getConnection();
    let userId;
    try {
      await conn.beginTransaction();
      userId = await AuthModel.createUser({ email, passwordHash, name, city, phone, role }, conn);
      if (role === 'EXPERT') {
        await AuthModel.createExpertProfile(userId, {
          gender, bio, experienceYears: experience_years, servicePincodes: service_pincodes,
        }, conn);
        if (Array.isArray(service_ids) && service_ids.length) {
          await AuthModel.addExpertServices(userId, service_ids, conn);
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.status(201).json({ id: userId, email, role });
  },

  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) throw BadRequest('MISSING_FIELDS', 'Email and password are required.');

    const user = await AuthModel.findByEmail(email);
    const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !validPassword) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    if (user.is_blocked) throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Your account has been suspended. Contact support.');

    const role = await AuthModel.getRoleByUserId(user.id);
    res.json(await issueTokens({ id: user.id, email: user.email, role }));
  },

  // ── OTP login ───────────────────────────────────────────────────────────
  async requestOtp(req, res) {
    const phone = normalizePhone(req.body.phone);
    if (!phone) throw BadRequest('INVALID_PHONE', 'Enter a valid 10-digit mobile number.');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    await AuthModel.createOtp(phone, otpHash, new Date(Date.now() + OTP_TTL_MS));
    await smsProvider.sendOtp(phone, otp);

    res.json({ sent: true, phone, dev_otp: devOtp(otp) });
  },

  async verifyOtp(req, res) {
    const phone = normalizePhone(req.body.phone);
    const { otp } = req.body;
    if (!phone || !otp) throw BadRequest('MISSING_FIELDS', 'phone and otp are required.');

    const record = await AuthModel.latestOtp(phone);
    if (!record) throw BadRequest('OTP_NOT_FOUND', 'Request a new OTP.');
    if (new Date(record.expires_at) < new Date()) throw BadRequest('OTP_EXPIRED', 'This OTP has expired. Request a new one.');
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await AuthModel.consumeOtp(record.id);
      throw BadRequest('TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new OTP.');
    }

    const ok = await bcrypt.compare(String(otp), record.otp_hash);
    if (!ok) {
      await AuthModel.bumpOtpAttempts(record.id);
      throw new HttpError(401, 'OTP_INVALID', 'Incorrect OTP.');
    }

    await AuthModel.consumeOtp(record.id);
    let user = await AuthModel.findUserByPhone(phone);
    if (user?.is_blocked) throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Your account has been suspended. Contact support.');
    const isNew = !user;
    if (!user) user = await AuthModel.createPhoneUser(phone);

    res.json({ ...(await issueTokens({ id: user.id, email: user.email, role: user.role ?? 'CUSTOMER' })), is_new: isNew });
  },

  // ── Token rotation ────────────────────────────────────────────────────────
  async refresh(req, res) {
    const { refresh_token } = req.body;
    if (!refresh_token) throw BadRequest('MISSING_TOKEN', 'refresh_token is required.');

    const record = await AuthModel.findRefreshToken(hashToken(refresh_token));
    if (!record) throw new HttpError(401, 'REFRESH_INVALID', 'Session expired. Please log in again.');

    // Rotate: revoke the presented token and issue a fresh pair.
    await AuthModel.revokeRefreshToken(record.token_hash);
    res.json(await issueTokens({ id: record.user_id, email: record.email, role: record.role ?? 'CUSTOMER' }));
  },

  async logout(req, res) {
    const { refresh_token } = req.body;
    if (refresh_token) await AuthModel.revokeRefreshToken(hashToken(refresh_token));
    res.json({ status: 'logged_out' });
  },
};
