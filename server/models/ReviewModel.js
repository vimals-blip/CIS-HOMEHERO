import crypto from 'node:crypto';
import pool from '../db.js';

export const ReviewModel = {
  async findByProvider(providerId) {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.provider_reply, r.created_at, p.name AS customer_name
       FROM reviews r
       LEFT JOIN profiles p ON p.id = r.customer_id
       WHERE r.provider_id = ? AND r.is_flagged = 0
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [providerId],
    );
    return rows ?? [];
  },

  async findByBooking(bookingId) {
    const [rows] = await pool.query('SELECT id FROM reviews WHERE booking_id = ?', [bookingId]);
    return rows[0] ?? null;
  },

  async create({ bookingId, providerId, customerId, rating, comment }) {
    const id = `review-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO reviews (id, booking_id, provider_id, customer_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, bookingId, providerId, customerId, rating, comment ?? null],
    );
    return id;
  },

  async recalcProviderStats(providerId) {
    const [[stats]] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE provider_id = ? AND is_flagged = 0',
      [providerId],
    );
    await pool.query('UPDATE providers SET avg_rating = ?, review_count = ? WHERE id = ?', [
      Number(stats.avg_rating ?? 0).toFixed(2),
      stats.review_count,
      providerId,
    ]);
  },
};
