import crypto from 'node:crypto';
import pool from '../db.js';

export const CouponModel = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows ?? [];
  },

  async findByCode(code) {
    const [rows] = await pool.query('SELECT id FROM coupons WHERE code = ?', [code]);
    return rows[0] ?? null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT id FROM coupons WHERE id = ?', [id]);
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
};
