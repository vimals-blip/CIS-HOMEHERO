import pool from '../db.js';

export const ProfileModel = {
  // Full account view for the logged-in user.
  async getMe(userId) {
    const [[row]] = await pool.query(
      `SELECT u.id, u.email, p.name, p.phone, p.city, p.avatar_url, ur.role
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = ?`,
      [userId],
    );
    return row ?? null;
  },

  async updateProfile(userId, { name, phone, city, avatarUrl }) {
    const cols = [], vals = [];
    if (name !== undefined) { cols.push('name = ?'); vals.push(name); }
    if (phone !== undefined) { cols.push('phone = ?'); vals.push(phone); }
    if (city !== undefined) { cols.push('city = ?'); vals.push(city); }
    if (avatarUrl !== undefined) { cols.push('avatar_url = ?'); vals.push(avatarUrl); }
    if (!cols.length) return;
    await pool.query(`UPDATE profiles SET ${cols.join(', ')} WHERE id = ?`, [...vals, userId]);
    if (phone !== undefined) {
      await pool.query(
        'INSERT INTO profile_contacts (user_id, phone, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = VALUES(phone)',
        [userId, phone],
      );
    }
  },

  async getPasswordHash(userId) {
    const [[row]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return row?.password_hash ?? null;
  },

  async updatePassword(userId, passwordHash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  },
};
