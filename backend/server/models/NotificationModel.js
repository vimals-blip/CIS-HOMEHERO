import crypto from 'node:crypto';
import pool from '../db.js';

export const NotificationModel = {
  async create({ userId, type, title, body, bookingId }) {
    const id = `ntf-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, body, booking_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
      [id, userId, type, title, body ?? null, bookingId ?? null],
    );
    return id;
  },

  async listForUser(userId, limit = 30) {
    const [rows] = await pool.query(
      'SELECT id, type, title, body, booking_id, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
    );
    return rows ?? [];
  },

  async unreadCount(userId) {
    const [[row]] = await pool.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return Number(row?.c ?? 0);
  },

  async markRead(id, userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  },

  async markAllRead(userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  },

  async deviceTokens(userId) {
    const [rows] = await pool.query('SELECT token FROM device_tokens WHERE user_id = ?', [userId]);
    return (rows ?? []).map((r) => r.token);
  },

  async saveDeviceToken(userId, token, platform = 'web') {
    await pool.query(
      'INSERT INTO device_tokens (token, user_id, platform, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)',
      [token, userId, platform],
    );
  },
};
