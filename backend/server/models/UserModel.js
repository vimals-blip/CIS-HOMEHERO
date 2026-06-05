import pool from '../db.js';

export const UserModel = {
  async findAll({ limit, offset, q, role }) {
    const filters = [], params = [];
    if (q) { filters.push('(p.name LIKE ? OR u.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (role) { filters.push('ur.role = ?'); params.push(role); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.is_verified, u.is_blocked, u.created_at, ur.role, p.name, p.city, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN profiles p ON p.id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return users ?? [];
  },

  async findById(userId) {
    const [rows] = await pool.query('SELECT id, email, is_verified, is_blocked, created_at FROM users WHERE id = ?', [userId]);
    return rows[0] ?? null;
  },

  // Full activity history for the admin detail view — includes who the
  // counterparty was and (for expert jobs) the expert's earning on each.
  async bookingsForUser(userId) {
    const [rows] = await pool.query(
      `SELECT b.id, b.status, b.booking_type, b.total_amount, b.expert_amount, b.created_at,
        s.name AS service_name,
        cust.name AS customer_name, exp.name AS expert_name,
        CASE WHEN b.customer_id = ? THEN 'customer' ELSE 'expert' END AS as_role
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       LEFT JOIN profiles cust ON cust.id = b.customer_id
       LEFT JOIN profiles exp ON exp.id = b.expert_id
       WHERE b.customer_id = ? OR b.expert_id = ?
       ORDER BY b.created_at DESC LIMIT 25`,
      [userId, userId, userId],
    );
    return (rows ?? []).map((r) => ({
      ...r,
      total_amount: Number(r.total_amount),
      expert_amount: Number(r.expert_amount),
    }));
  },

  async statsForUser(userId) {
    const [[c]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM bookings WHERE customer_id = ?) AS bookings_made,
        (SELECT COUNT(*) FROM bookings WHERE expert_id = ?) AS jobs_done,
        (SELECT COALESCE(SUM(total_amount),0) FROM bookings WHERE customer_id = ? AND status = 'COMPLETED') AS total_spent,
        (SELECT COUNT(*) FROM reviews WHERE customer_id = ?) AS reviews_written`,
      [userId, userId, userId, userId],
    );
    return { bookings_made: Number(c.bookings_made), jobs_done: Number(c.jobs_done), total_spent: Number(c.total_spent), reviews_written: Number(c.reviews_written) };
  },

  async updateProfile(userId, { name, phone, city }) {
    const cols = [], vals = [];
    if (name !== undefined) { cols.push('name = ?'); vals.push(name); }
    if (phone !== undefined) { cols.push('phone = ?'); vals.push(phone); }
    if (city !== undefined) { cols.push('city = ?'); vals.push(city); }
    if (!cols.length) return;
    await pool.query(`UPDATE profiles SET ${cols.join(', ')} WHERE id = ?`, [...vals, userId]);
  },

  async setBlocked(userId, blocked) {
    await pool.query('UPDATE users SET is_blocked = ? WHERE id = ?', [Number(blocked), userId]);
  },

  async setPassword(userId, passwordHash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  },

  // Hard delete — profiles FK cascades to bookings/experts/etc.; then users row.
  async remove(userId) {
    await pool.query('DELETE FROM profiles WHERE id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  },

  async getProfile(userId) {
    const [[profile]] = await pool.query(
      'SELECT name, city, avatar_url, phone FROM profiles WHERE id = ?',
      [userId],
    );
    return profile ?? null;
  },

  async getRoles(userId) {
    const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    return rows.map((r) => r.role);
  },

  async getExpertInfo(userId) {
    const [[expert]] = await pool.query(
      'SELECT gender, bio, experience_years, is_verified, status, avg_rating, total_jobs FROM experts WHERE id = ?',
      [userId],
    );
    return expert ?? null;
  },

  async findByEmail(email) {
    const [[row]] = await pool.query('SELECT id, email FROM users WHERE email = ?', [email]);
    return row ?? null;
  },

  async listAdmins() {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, p.name, ur.role, u.created_at
       FROM user_roles ur JOIN users u ON u.id = ur.user_id LEFT JOIN profiles p ON p.id = u.id
       WHERE ur.role IN ('ADMIN','SUPER_ADMIN') ORDER BY ur.role DESC, u.created_at ASC`,
    );
    return rows ?? [];
  },

  async setRole(userId, role) {
    await pool.query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [userId, userId, role],
    );
  },
};
