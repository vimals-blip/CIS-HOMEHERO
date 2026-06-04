import crypto from 'node:crypto';
import pool from '../db.js';

export const ServiceModel = {
  async findAll({ activeOnly = true } = {}) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await pool.query(
      `SELECT * FROM services ${where} ORDER BY sort_order ASC, name ASC`,
    );
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async findBySlug(slug) {
    const [rows] = await pool.query('SELECT * FROM services WHERE slug = ?', [slug]);
    return rows[0] ?? null;
  },

  async create({ name, slug, tagline, description, iconName, imageUrl, ratePerHour, minHours, sortOrder }) {
    const id = `svc-${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO services (id, name, slug, tagline, description, icon_name, image_url, rate_per_hour, min_hours, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [id, name, slug, tagline ?? null, description ?? null, iconName ?? null, imageUrl ?? null, ratePerHour ?? 0, minHours ?? 1, sortOrder ?? 0],
    );
    return id;
  },

  async update(id, fields) {
    const map = {
      name: 'name', tagline: 'tagline', description: 'description', iconName: 'icon_name',
      imageUrl: 'image_url', ratePerHour: 'rate_per_hour', minHours: 'min_hours',
      sortOrder: 'sort_order', isActive: 'is_active',
    };
    const cols = [], vals = [];
    for (const [key, col] of Object.entries(map)) {
      if (fields[key] !== undefined) { cols.push(`${col} = ?`); vals.push(fields[key]); }
    }
    if (!cols.length) return;
    await pool.query(`UPDATE services SET ${cols.join(', ')} WHERE id = ?`, [...vals, id]);
  },
};
