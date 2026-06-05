import crypto from 'node:crypto';
import pool from '../db.js';

// Append a wallet ledger entry (CREDIT/DEBIT) for a user.
async function ledger(userId, bookingId, type, amount, description) {
  const id = `txn-${crypto.randomUUID()}`;
  await pool.query(
    'INSERT INTO transactions (id, user_id, booking_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [id, userId, bookingId ?? null, type, amount, description ?? null],
  );
}

export const WalletModel = {
  // ── Expert earnings wallet ────────────────────────────────────────────────
  async findByExpert(expertId) {
    const [rows] = await pool.query('SELECT * FROM expert_wallet WHERE expert_id = ?', [expertId]);
    if (rows.length === 0) {
      return { expert_id: expertId, pending_balance: 0, available_balance: 0, total_earned: 0 };
    }
    const r = rows[0];
    return {
      expert_id: r.expert_id,
      pending_balance: Number(r.pending_balance),
      available_balance: Number(r.available_balance),
      total_earned: Number(r.total_earned),
    };
  },

  // Credit an expert's wallet when a job completes (counts toward total_earned).
  async credit(expertId, amount) {
    await pool.query(
      `INSERT INTO expert_wallet (expert_id, available_balance, pending_balance, total_earned)
       VALUES (?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE available_balance = available_balance + VALUES(available_balance),
                               total_earned = total_earned + VALUES(total_earned)`,
      [expertId, amount, amount],
    );
  },

  // Reduce available balance when a withdrawal is requested.
  async debitExpert(expertId, amount) {
    await pool.query(
      'UPDATE expert_wallet SET available_balance = available_balance - ? WHERE expert_id = ?',
      [amount, expertId],
    );
  },

  // Return funds to available balance (e.g. a rejected withdrawal). Does not
  // touch total_earned since it was already counted.
  async creditExpertAvailable(expertId, amount) {
    await pool.query(
      'UPDATE expert_wallet SET available_balance = available_balance + ? WHERE expert_id = ?',
      [amount, expertId],
    );
  },

  // ── Customer prepaid wallet ───────────────────────────────────────────────
  async getCustomer(userId) {
    const [rows] = await pool.query('SELECT * FROM customer_wallet WHERE user_id = ?', [userId]);
    if (rows.length === 0) return { user_id: userId, balance: 0, total_added: 0, total_spent: 0 };
    const r = rows[0];
    return { user_id: r.user_id, balance: Number(r.balance), total_added: Number(r.total_added), total_spent: Number(r.total_spent) };
  },

  async ensureCustomer(userId, conn = pool) {
    await conn.query('INSERT INTO customer_wallet (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_id = user_id', [userId]);
  },

  // Add money to a customer wallet (top-up). Records a CREDIT ledger entry.
  async topUp(userId, amount, description = 'Wallet top-up') {
    await this.ensureCustomer(userId);
    await pool.query(
      'UPDATE customer_wallet SET balance = balance + ?, total_added = total_added + ? WHERE user_id = ?',
      [amount, amount, userId],
    );
    await ledger(userId, null, 'CREDIT', amount, description);
    return this.getCustomer(userId);
  },

  // Debit a customer wallet inside an existing transaction connection.
  // Caller must have verified sufficient balance.
  async debitWithConn(conn, userId, amount, bookingId, description) {
    await conn.query(
      'UPDATE customer_wallet SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?',
      [amount, amount, userId],
    );
    const id = `txn-${crypto.randomUUID()}`;
    await conn.query(
      'INSERT INTO transactions (id, user_id, booking_id, type, amount, description, created_at) VALUES (?, ?, ?, "DEBIT", ?, ?, NOW())',
      [id, userId, bookingId ?? null, amount, description ?? 'Booking payment'],
    );
  },

  // Refund a wallet payment back to the customer (e.g. on cancellation).
  async refund(userId, amount, bookingId, description = 'Refund') {
    await this.ensureCustomer(userId);
    await pool.query(
      'UPDATE customer_wallet SET balance = balance + ?, total_spent = GREATEST(0, total_spent - ?) WHERE user_id = ?',
      [amount, amount, userId],
    );
    await ledger(userId, bookingId, 'CREDIT', amount, description);
  },

  async transactionsForUser(userId, limit = 30) {
    const [rows] = await pool.query(
      'SELECT id, booking_id, type, amount, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
    );
    return (rows ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  },
};
