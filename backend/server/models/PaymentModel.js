import crypto from 'node:crypto';
import pool from '../db.js';

export const PaymentModel = {
  async create({ bookingId, amount, method = 'CASH', status }) {
    const id = `payment-${crypto.randomUUID()}`;
    const paidAt = status === 'PAID' ? new Date() : null;
    await pool.query(
      'INSERT INTO payments (id, booking_id, amount, method, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, bookingId, amount, method, status, paidAt],
    );
    return { id, bookingId, amount, method, status };
  },

  async findByBooking(bookingId) {
    const [rows] = await pool.query('SELECT id, customer_id FROM bookings WHERE id = ?', [bookingId]);
    return rows[0] ?? null;
  },
};
