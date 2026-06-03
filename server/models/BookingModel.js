import pool from '../db.js';

const BASE_SQL = `
  SELECT b.*, c.name AS category_name,
    pr.name AS provider_name,
    cust.name AS customer_name
  FROM bookings b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN profiles pr ON pr.id = b.provider_id
  LEFT JOIN profiles cust ON cust.id = b.customer_id
`;

export const BookingModel = {
  async findFiltered({ customerId, providerId }) {
    const filters = [], params = [];
    let sql = BASE_SQL;
    if (customerId) { filters.push('b.customer_id = ?'); params.push(customerId); }
    if (providerId) { filters.push('b.provider_id = ?'); params.push(providerId); }
    if (filters.length) sql += ` WHERE ${filters.join(' AND ')}`;
    sql += ' ORDER BY b.scheduled_date DESC, b.scheduled_time DESC';
    const [rows] = await pool.query(sql, params);
    return rows ?? [];
  },

  async findAll({ status, limit, offset }) {
    const params = [];
    let where = '';
    if (status) { where = 'WHERE b.status = ?'; params.push(status); }
    const [rows] = await pool.query(`${BASE_SQL} ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async create({ id, address, categoryId, couponCode, customerId, providerId, scheduledDate, scheduledTime, totalAmount, platformFee, providerAmount, notes }) {
    await pool.query(
      `INSERT INTO bookings
       (id, address, category_id, coupon_code, customer_id, provider_id, scheduled_date, scheduled_time, total_amount, platform_fee, provider_amount, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
      [id, address, categoryId, couponCode ?? null, customerId, providerId, scheduledDate, scheduledTime, totalAmount, platformFee ?? 0, providerAmount ?? 0, notes ?? null],
    );
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },
};
