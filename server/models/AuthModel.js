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

  async createUser({ email, passwordHash, name, city, phone, role }) {
    const id = `user-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO users (id, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, 1, NOW())',
      [id, email, passwordHash],
    );
    await pool.query(
      'INSERT INTO profiles (id, name, city, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city)',
      [id, name ?? null, city ?? null],
    );
    if (phone) {
      await pool.query(
        'INSERT INTO profile_contacts (user_id, phone, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = VALUES(phone)',
        [id, phone],
      );
    }
    await pool.query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [id, id, role],
    );
    return id;
  },

  async createProviderProfile(userId, { bio, experienceYears, hourlyRate }) {
    await pool.query(
      `INSERT INTO providers (id, avg_rating, bio, experience_years, hourly_rate, is_verified, pin_codes, review_count, status, created_at)
       VALUES (?, 0, ?, ?, ?, 0, JSON_ARRAY(), 0, 'OFFLINE', NOW())
       ON DUPLICATE KEY UPDATE bio = VALUES(bio), experience_years = VALUES(experience_years), hourly_rate = VALUES(hourly_rate)`,
      [userId, bio ?? null, experienceYears ?? 0, hourlyRate ?? 0],
    );
  },

  async addProviderCategories(providerId, categoryIds) {
    for (const categoryId of categoryIds) {
      await pool.query(
        'INSERT INTO provider_categories (provider_id, category_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE category_id = VALUES(category_id)',
        [providerId, categoryId],
      );
    }
  },

  async getRoleByUserId(userId) {
    const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    return rows[0]?.role ?? 'CUSTOMER';
  },
};
