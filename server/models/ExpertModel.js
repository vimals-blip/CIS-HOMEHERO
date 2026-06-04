import pool from '../db.js';

const PUBLIC_SELECT = `
  SELECT e.*, pr.name, pr.avatar_url, pr.city
  FROM experts e
  LEFT JOIN profiles pr ON pr.id = e.id
`;

export const ExpertModel = {
  // Public list of verified experts, optionally filtered by service.
  async findList({ serviceId, limit, offset }) {
    if (serviceId) {
      const [rows] = await pool.query(
        `${PUBLIC_SELECT}
         JOIN expert_services es ON es.expert_id = e.id
         WHERE e.is_verified = 1 AND es.service_id = ?
         ORDER BY e.avg_rating DESC, e.total_jobs DESC
         LIMIT ? OFFSET ?`,
        [serviceId, limit, offset],
      );
      return rows ?? [];
    }
    const [rows] = await pool.query(
      `${PUBLIC_SELECT}
       WHERE e.is_verified = 1
       ORDER BY e.avg_rating DESC, e.total_jobs DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query(`${PUBLIC_SELECT} WHERE e.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async getServiceIds(expertId) {
    const [rows] = await pool.query('SELECT service_id FROM expert_services WHERE expert_id = ?', [expertId]);
    return rows.map((r) => r.service_id);
  },

  // Find the best available expert to handle an instant booking for a service.
  // Prefers ONLINE & verified experts who offer the service; falls back to any
  // verified expert offering it so demo bookings can always be assigned.
  async findAvailableForService(serviceId) {
    const [online] = await pool.query(
      `SELECT e.* FROM experts e
       JOIN expert_services es ON es.expert_id = e.id
       WHERE es.service_id = ? AND e.is_verified = 1 AND e.status = 'ONLINE'
       ORDER BY e.avg_rating DESC, e.total_jobs DESC
       LIMIT 1`,
      [serviceId],
    );
    if (online[0]) return online[0];

    const [any] = await pool.query(
      `SELECT e.* FROM experts e
       JOIN expert_services es ON es.expert_id = e.id
       WHERE es.service_id = ? AND e.is_verified = 1 AND e.status <> 'BUSY'
       ORDER BY e.avg_rating DESC, e.total_jobs DESC
       LIMIT 1`,
      [serviceId],
    );
    return any[0] ?? null;
  },

  // Dispatch candidates: ONLINE, verified experts who offer the service,
  // with their current location, rating and active-job count for ranking.
  async findCandidatesForService(serviceId) {
    const [rows] = await pool.query(
      `SELECT e.id, e.avg_rating, e.current_lat, e.current_lng, e.status,
        (SELECT COUNT(*) FROM bookings b
          WHERE b.expert_id = e.id
            AND b.status IN ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')) AS active_jobs
       FROM experts e
       JOIN expert_services es ON es.expert_id = e.id
       WHERE es.service_id = ? AND e.is_verified = 1 AND e.status = 'ONLINE'`,
      [serviceId],
    );
    return rows ?? [];
  },

  async setStatus(id, status) {
    await pool.query('UPDATE experts SET status = ? WHERE id = ?', [status, id]);
  },

  async setLocation(id, lat, lng) {
    await pool.query('UPDATE experts SET current_lat = ?, current_lng = ? WHERE id = ?', [lat, lng, id]);
  },

  async setVerified(id, isVerified) {
    await pool.query(
      "UPDATE experts SET is_verified = ?, is_trained = ?, onboarding_status = ? WHERE id = ?",
      [Number(isVerified), Number(isVerified), isVerified ? 'APPROVED' : 'REJECTED', id],
    );
  },

  async incrementJobs(id) {
    await pool.query('UPDATE experts SET total_jobs = total_jobs + 1 WHERE id = ?', [id]);
  },

  async recalcStats(expertId) {
    const [[stats]] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE expert_id = ?',
      [expertId],
    );
    await pool.query('UPDATE experts SET avg_rating = ?, review_count = ? WHERE id = ?', [
      Number(stats.avg_rating ?? 0).toFixed(2),
      stats.review_count ?? 0,
      expertId,
    ]);
  },

  async findAdminList({ isVerified, status, q, limit, offset }) {
    const filters = [], params = [];
    if (isVerified === 'true') filters.push('e.is_verified = 1');
    else if (isVerified === 'false') filters.push('e.is_verified = 0');
    if (status) { filters.push('e.status = ?'); params.push(status); }
    if (q) { filters.push('pr.name LIKE ?'); params.push(`%${q}%`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${PUBLIC_SELECT} ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows ?? [];
  },
};
