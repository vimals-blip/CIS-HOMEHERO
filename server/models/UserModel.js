import pool from '../db.js';

export const UserModel = {
  async findAll({ limit, offset }) {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.is_verified, u.created_at, ur.role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return users ?? [];
  },

  async findById(userId) {
    const [rows] = await pool.query('SELECT id, email, is_verified, created_at FROM users WHERE id = ?', [userId]);
    return rows[0] ?? null;
  },

  async getProfile(userId) {
    const [[profile]] = await pool.query(
      `SELECT pr.name, pr.city, pr.avatar_url, pc.phone
       FROM profiles pr
       LEFT JOIN profile_contacts pc ON pc.user_id = pr.id
       WHERE pr.id = ?`,
      [userId],
    );
    return profile ?? null;
  },

  async getRoles(userId) {
    const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    return rows.map((r) => r.role);
  },

  async getProviderInfo(userId) {
    const [[provider]] = await pool.query(
      'SELECT bio, experience_years, hourly_rate, is_verified FROM providers WHERE id = ?',
      [userId],
    );
    return provider ?? null;
  },
};
