import crypto from 'node:crypto';
import pool from '../db.js';

export const PaymentModel = {
  async create({ bookingId, amount, status }) {
    const id = `payment-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO payments (id, booking_id, amount, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, bookingId, amount, status],
    );
    return { id, bookingId, amount, status };
  },

  async findByBooking(bookingId) {
    const [rows] = await pool.query('SELECT id, customer_id FROM bookings WHERE id = ?', [bookingId]);
    return rows[0] ?? null;
  },
};
