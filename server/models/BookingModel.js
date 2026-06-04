import crypto from 'node:crypto';
import pool from '../db.js';

const BASE_SQL = `
  SELECT b.*,
    s.name AS service_name, s.slug AS service_slug, s.icon_name AS service_icon, s.image_url AS service_image,
    ep.name AS expert_name, ep.avatar_url AS expert_avatar, e.avg_rating AS expert_rating,
    cust.name AS customer_name, cust.phone AS customer_phone, cust.avatar_url AS customer_avatar
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN experts e ON e.id = b.expert_id
  LEFT JOIN profiles ep ON ep.id = b.expert_id
  LEFT JOIN profiles cust ON cust.id = b.customer_id
`;

export const BookingModel = {
  async create(data, conn = pool) {
    const id = data.id ?? `bk-${crypto.randomUUID()}`;
    await conn.query(
      `INSERT INTO bookings
       (id, customer_id, expert_id, service_id, booking_type, scheduled_at, duration_hours, status, eta_minutes,
        address_snapshot, pincode, lat, lng, base_amount, platform_fee, expert_amount, total_amount,
        discount_amount, payment_method, payment_status, coupon_code, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, data.customerId, data.expertId ?? null, data.serviceId, data.bookingType,
        data.scheduledAt ?? null, data.durationHours, data.status, data.etaMinutes ?? null,
        data.addressSnapshot, data.pincode ?? null, data.lat ?? null, data.lng ?? null,
        data.baseAmount, data.platformFee, data.expertAmount, data.totalAmount,
        data.discountAmount ?? 0, data.paymentMethod ?? 'CASH', data.paymentStatus ?? 'PENDING',
        data.couponCode ?? null, data.notes ?? null,
      ],
    );
    return id;
  },

  async findById(id) {
    const [rows] = await pool.query(`${BASE_SQL} WHERE b.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async findForCustomer(customerId) {
    const [rows] = await pool.query(`${BASE_SQL} WHERE b.customer_id = ? ORDER BY b.created_at DESC`, [customerId]);
    return rows ?? [];
  },

  async findForExpert(expertId) {
    const [rows] = await pool.query(`${BASE_SQL} WHERE b.expert_id = ? ORDER BY b.created_at DESC`, [expertId]);
    return rows ?? [];
  },

  async findAll({ status, limit, offset }) {
    const params = [];
    let where = '';
    if (status) { where = 'WHERE b.status = ?'; params.push(status); }
    const [rows] = await pool.query(`${BASE_SQL} ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return rows ?? [];
  },

  async unassign(id) {
    await pool.query(
      "UPDATE bookings SET expert_id = NULL, status = 'SEARCHING', eta_minutes = NULL, updated_at = NOW() WHERE id = ?",
      [id],
    );
  },

  async assignExpert(id, expertId, etaMinutes) {
    await pool.query(
      "UPDATE bookings SET expert_id = ?, status = 'ASSIGNED', eta_minutes = ?, updated_at = NOW() WHERE id = ?",
      [expertId, etaMinutes ?? null, id],
    );
  },

  async updateStatus(id, status, extra = {}) {
    const cols = ['status = ?'], vals = [status];
    if (extra.startedAt) cols.push('started_at = NOW()');
    if (extra.completedAt) cols.push('completed_at = NOW()');
    if (extra.cancelReason !== undefined) { cols.push('cancel_reason = ?'); vals.push(extra.cancelReason); }
    if (extra.etaMinutes !== undefined) { cols.push('eta_minutes = ?'); vals.push(extra.etaMinutes); }
    if (extra.paymentStatus !== undefined) { cols.push('payment_status = ?'); vals.push(extra.paymentStatus); }
    cols.push('updated_at = NOW()');
    await pool.query(`UPDATE bookings SET ${cols.join(', ')} WHERE id = ?`, [...vals, id]);
  },

  async addEvent(bookingId, status, message) {
    const id = `evt-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO booking_events (id, booking_id, status, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, bookingId, status, message ?? null],
    );
  },

  async listEvents(bookingId) {
    const [rows] = await pool.query(
      'SELECT id, status, message, created_at FROM booking_events WHERE booking_id = ? ORDER BY created_at ASC',
      [bookingId],
    );
    return rows ?? [];
  },
};
