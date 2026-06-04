import crypto from 'node:crypto';
import pool from '../db.js';

export const AddressModel = {
  async listByCustomer(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [customerId],
    );
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM addresses WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async create({ customerId, label, flat, addressLine, landmark, city, pincode, lat, lng, isDefault }) {
    const id = `addr-${crypto.randomUUID()}`;
    if (isDefault) {
      await pool.query('UPDATE addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    }
    await pool.query(
      `INSERT INTO addresses (id, customer_id, label, flat, address_line, landmark, city, pincode, lat, lng, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, customerId, label ?? 'Home', flat ?? null, addressLine, landmark ?? null, city, pincode, lat ?? null, lng ?? null, isDefault ? 1 : 0],
    );
    return id;
  },

  async setDefault(customerId, id) {
    await pool.query('UPDATE addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    await pool.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND customer_id = ?', [id, customerId]);
  },

  async remove(id) {
    await pool.query('DELETE FROM addresses WHERE id = ?', [id]);
  },
};
