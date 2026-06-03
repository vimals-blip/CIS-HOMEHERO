import pool from '../db.js';

export const WalletModel = {
  async findByProvider(providerId) {
    const [rows] = await pool.query('SELECT * FROM provider_wallet WHERE provider_id = ?', [providerId]);
    if (rows.length === 0) {
      return { provider_id: providerId, pending_balance: 0, available_balance: 0, total_earned: 0 };
    }
    const r = rows[0];
    return {
      provider_id: r.provider_id,
      pending_balance: Number(r.pending_balance),
      available_balance: Number(r.available_balance),
      total_earned: Number(r.total_earned),
    };
  },
};
