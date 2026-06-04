import crypto from 'node:crypto';
import pool from '../db.js';

export const PaymentTxnModel = {
  async create({ userId, bookingId, orderId, amount, purpose, provider }) {
    const id = `ptxn-${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO payment_transactions (id, user_id, booking_id, order_id, amount, purpose, provider, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CREATED', NOW(), NOW())`,
      [id, userId, bookingId ?? null, orderId, amount, purpose, provider],
    );
    return id;
  },

  async findByOrderId(orderId) {
    const [rows] = await pool.query('SELECT * FROM payment_transactions WHERE order_id = ?', [orderId]);
    return rows[0] ?? null;
  },

  async markPaid(id, paymentId, signature) {
    await pool.query(
      "UPDATE payment_transactions SET status = 'PAID', payment_id = ?, signature = ?, updated_at = NOW() WHERE id = ?",
      [paymentId, signature ?? null, id],
    );
  },

  async markFailed(id) {
    await pool.query("UPDATE payment_transactions SET status = 'FAILED', updated_at = NOW() WHERE id = ?", [id]);
  },
};
