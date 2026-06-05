import crypto from 'node:crypto';
import pool from '../db.js';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

export const CouponModel = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows ?? [];
  },

  async findByCode(code) {
    const [rows] = await pool.query('SELECT * FROM coupons WHERE code = ?', [code]);
    return rows[0] ?? null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM coupons WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async create({ code, type, value, maxUses, expiresAt }) {
    const id = `coupon-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO coupons (id, code, type, value, used_count, max_uses, is_active, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, 1, ?, NOW())',
      [id, code, type, value, maxUses ?? null, expiresAt ?? null],
    );
    return { id, code, type, value, is_active: true };
  },

  async setActive(id, isActive) {
    await pool.query('UPDATE coupons SET is_active = ? WHERE id = ?', [Number(isActive), id]);
  },

  // How many times this user has already redeemed this coupon.
  async usageCountForUser(couponId, userId) {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS c FROM coupon_usage WHERE coupon_id = ? AND user_id = ?',
      [couponId, userId],
    );
    return Number(row?.c ?? 0);
  },

  // Validate a coupon against a subtotal for a given user. Returns
  // { coupon, discount } or throws a reason string via the `reason` field.
  async evaluate(code, subtotal, userId) {
    const coupon = await this.findByCode(String(code).toUpperCase());
    if (!coupon) return { ok: false, reason: 'Coupon not found.' };
    if (!coupon.is_active) return { ok: false, reason: 'This coupon is no longer active.' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { ok: false, reason: 'This coupon has expired.' };
    }
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
      return { ok: false, reason: 'This coupon has reached its usage limit.' };
    }
    // One redemption per customer.
    if (userId && (await this.usageCountForUser(coupon.id, userId)) > 0) {
      return { ok: false, reason: 'You have already used this coupon.' };
    }

    const raw = coupon.type === 'PERCENT'
      ? (Number(subtotal) * Number(coupon.value)) / 100
      : Number(coupon.value);
    const discount = round2(Math.min(raw, Number(subtotal)));
    return { ok: true, coupon, discount };
  },

  async recordUsage(couponId, userId, bookingId, discount) {
    const id = `cpu-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO coupon_usage (id, coupon_id, user_id, booking_id, discount, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, couponId, userId, bookingId ?? null, discount],
    );
    await pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]);
  },
};
