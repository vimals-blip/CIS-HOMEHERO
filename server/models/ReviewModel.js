import crypto from 'node:crypto';
import pool from '../db.js';

export const ReviewModel = {
  async findByExpert(expertId) {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, p.name AS customer_name
       FROM reviews r
       LEFT JOIN profiles p ON p.id = r.customer_id
       WHERE r.expert_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [expertId],
    );
    return rows ?? [];
  },

  async findByBooking(bookingId) {
    const [rows] = await pool.query('SELECT id FROM reviews WHERE booking_id = ?', [bookingId]);
    return rows[0] ?? null;
  },

  async create({ bookingId, expertId, customerId, rating, comment }) {
    const id = `review-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO reviews (id, booking_id, expert_id, customer_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, bookingId, expertId, customerId, rating, comment ?? null],
    );
    return id;
  },
};
