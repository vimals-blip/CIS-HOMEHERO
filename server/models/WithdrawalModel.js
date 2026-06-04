import crypto from 'node:crypto';
import pool from '../db.js';

const SELECT = `
  SELECT w.*, pr.name AS expert_name
  FROM withdrawal_requests w
  LEFT JOIN profiles pr ON pr.id = w.expert_id
`;

export const WithdrawalModel = {
  async create({ expertId, amount, bankAccount, bankIfsc }) {
    const id = `wd-${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO withdrawal_requests (id, expert_id, amount, status, bank_account, bank_ifsc, requested_at)
       VALUES (?, ?, ?, 'REQUESTED', ?, ?, NOW())`,
      [id, expertId, amount, bankAccount ?? null, bankIfsc ?? null],
    );
    return id;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM withdrawal_requests WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async listForExpert(expertId) {
    const [rows] = await pool.query(
      'SELECT * FROM withdrawal_requests WHERE expert_id = ? ORDER BY requested_at DESC',
      [expertId],
    );
    return (rows ?? []).map((w) => ({ ...w, amount: Number(w.amount) }));
  },

  async listAll(status) {
    const params = [];
    let where = '';
    if (status) { where = 'WHERE w.status = ?'; params.push(status); }
    const [rows] = await pool.query(`${SELECT} ${where} ORDER BY w.requested_at DESC LIMIT 100`, params);
    return (rows ?? []).map((w) => ({ ...w, amount: Number(w.amount) }));
  },

  async setStatus(id, status) {
    await pool.query('UPDATE withdrawal_requests SET status = ?, processed_at = NOW() WHERE id = ?', [status, id]);
  },
};
