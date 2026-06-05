import crypto from 'node:crypto';
import pool from '../db.js';

export const CmsModel = {
  // ── Banners ───────────────────────────────────────────────────────────────
  async listBanners({ activeOnly = true } = {}) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await pool.query(`SELECT * FROM banners ${where} ORDER BY sort_order ASC, created_at DESC`);
    return rows ?? [];
  },
  async createBanner({ title, imageUrl, linkUrl, sortOrder }) {
    const id = `ban-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO banners (id, title, image_url, link_url, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      [id, title, imageUrl, linkUrl ?? null, sortOrder ?? 0],
    );
    return id;
  },
  async setBannerActive(id, isActive) {
    await pool.query('UPDATE banners SET is_active = ? WHERE id = ?', [Number(isActive), id]);
  },

  // ── CMS pages ───────────────────────────────────────────────────────────────
  async getPage(slug) {
    const [rows] = await pool.query('SELECT * FROM cms_pages WHERE slug = ?', [slug]);
    return rows[0] ?? null;
  },
  async upsertPage({ slug, title, body }) {
    await pool.query(
      `INSERT INTO cms_pages (slug, title, body, updated_at) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), updated_at = NOW()`,
      [slug, title, body ?? null],
    );
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  async getSettings({ publicOnly = false } = {}) {
    const where = publicOnly ? 'WHERE is_public = 1' : '';
    const [rows] = await pool.query(`SELECT setting_key, setting_value, is_public FROM settings ${where}`);
    return rows ?? [];
  },
  async setSetting(key, value, isPublic) {
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value, is_public, updated_at) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public), updated_at = NOW()`,
      [key, value, isPublic ? 1 : 0],
    );
  },

  // ── Cities (super-admin) ─────────────────────────────────────────────────────
  async listCities({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await pool.query(`SELECT * FROM cities ${where} ORDER BY name ASC`);
    return rows ?? [];
  },
  async createCity({ name, state }) {
    const id = `city-${crypto.randomUUID()}`;
    await pool.query('INSERT INTO cities (id, name, state, is_active, created_at) VALUES (?, ?, ?, 1, NOW())', [id, name, state ?? null]);
    return id;
  },
  async setCityActive(id, isActive) {
    await pool.query('UPDATE cities SET is_active = ? WHERE id = ?', [Number(isActive), id]);
  },
};
