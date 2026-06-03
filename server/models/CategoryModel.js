import crypto from 'node:crypto';
import pool from '../db.js';

export const CategoryModel = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY name');
    return rows;
  },

  async findAllIncludingInactive() {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? AND is_active = 1', [id]);
    return rows[0] ?? null;
  },

  async create({ name, basePrice, commissionPct, iconName }) {
    const id = `cat-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO categories (id, name, base_price, commission_pct, icon_name, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      [id, name, basePrice ?? 0, commissionPct ?? 15, iconName ?? 'Sparkles'],
    );
    return { id, name, base_price: basePrice ?? 0, commission_pct: commissionPct ?? 15, icon_name: iconName ?? 'Sparkles', is_active: true };
  },

  async setActive(id, isActive) {
    await pool.query('UPDATE categories SET is_active = ? WHERE id = ?', [Number(isActive), id]);
  },
};
