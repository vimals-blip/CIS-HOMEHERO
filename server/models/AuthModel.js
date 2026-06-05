import crypto from 'node:crypto';
import pool from '../db.js';

export const AuthModel = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] ?? null;
  },

  async emailExists(email) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  },

  async createUser({ email, passwordHash, name, city, phone, role }, conn) {
    const db = conn ?? pool;
    const id = `user-${crypto.randomUUID()}`;
    await db.query(
      'INSERT INTO users (id, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, 1, NOW())',
      [id, email, passwordHash],
    );
    await db.query(
      `INSERT INTO profiles (id, name, phone, city, created_at) VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), city = VALUES(city)`,
      [id, name ?? null, phone ?? null, city ?? null],
    );
    if (phone) {
      await db.query(
        'INSERT INTO profile_contacts (user_id, phone, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = VALUES(phone)',
        [id, phone],
      );
    }
    await db.query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [id, id, role],
    );
    return id;
  },

  // Create an expert (worker) record. New experts start SUBMITTED and unverified
  // until an admin approves them.
  async createExpertProfile(userId, { gender, bio, experienceYears, servicePincodes }, conn) {
    const db = conn ?? pool;
    await db.query(
      `INSERT INTO experts (id, gender, bio, experience_years, is_verified, is_trained, status, service_pincodes, onboarding_status, created_at)
       VALUES (?, ?, ?, ?, 0, 0, 'OFFLINE', ?, 'SUBMITTED', NOW())
       ON DUPLICATE KEY UPDATE gender = VALUES(gender), bio = VALUES(bio), experience_years = VALUES(experience_years), service_pincodes = VALUES(service_pincodes)`,
      [userId, gender ?? 'FEMALE', bio ?? null, experienceYears ?? 0, JSON.stringify(servicePincodes ?? [])],
    );
    await db.query(
      'INSERT INTO expert_wallet (expert_id, available_balance, pending_balance, total_earned) VALUES (?, 0, 0, 0) ON DUPLICATE KEY UPDATE expert_id = expert_id',
      [userId],
    );
  },

  async addExpertServices(expertId, serviceIds, conn) {
    const db = conn ?? pool;
    for (const serviceId of serviceIds) {
      await db.query(
        'INSERT INTO expert_services (expert_id, service_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE service_id = VALUES(service_id)',
        [expertId, serviceId],
      );
    }
  },

  async getRoleByUserId(userId) {
    const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    return rows[0]?.role ?? 'CUSTOMER';
  },

  // ── Phone-based accounts (OTP login) ──────────────────────────────────────
  async findUserByPhone(phone) {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.is_blocked, ur.role
       FROM profiles p
       JOIN users u ON u.id = p.id
       LEFT JOIN user_roles ur ON ur.user_id = p.id
       WHERE p.phone = ?
       ORDER BY u.created_at ASC
       LIMIT 1`,
      [phone],
    );
    return rows[0] ?? null;
  },

  // Create a minimal customer account from a verified phone number.
  async createPhoneUser(phone) {
    const id = `user-${crypto.randomUUID()}`;
    const email = `${phone}@phone.homehero`;
    // Random unusable password — these accounts log in via OTP only.
    const placeholderHash = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'INSERT INTO users (id, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, 1, NOW())',
      [id, email, placeholderHash],
    );
    await pool.query(
      'INSERT INTO profiles (id, name, phone, created_at) VALUES (?, NULL, ?, NOW())',
      [id, phone],
    );
    await pool.query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, "CUSTOMER", NOW())',
      [id, id],
    );
    return { id, email, role: 'CUSTOMER' };
  },

  // ── OTP ───────────────────────────────────────────────────────────────────
  async createOtp(phone, otpHash, expiresAt) {
    const id = `otp-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO otp_verifications (id, phone, otp_hash, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, phone, otpHash, expiresAt],
    );
    return id;
  },

  async latestOtp(phone) {
    const [rows] = await pool.query(
      'SELECT * FROM otp_verifications WHERE phone = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1',
      [phone],
    );
    return rows[0] ?? null;
  },

  async bumpOtpAttempts(id) {
    await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [id]);
  },

  async consumeOtp(id) {
    await pool.query('UPDATE otp_verifications SET consumed = 1 WHERE id = ?', [id]);
  },

  // ── Refresh tokens ─────────────────────────────────────────────────────────
  async saveRefreshToken(userId, tokenHash, expiresAt) {
    const id = `rt-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, userId, tokenHash, expiresAt],
    );
  },

  async findRefreshToken(tokenHash) {
    const [rows] = await pool.query(
      `SELECT rt.*, u.email, ur.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       LEFT JOIN user_roles ur ON ur.user_id = rt.user_id
       WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > NOW()`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash) {
    await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
  },
};
