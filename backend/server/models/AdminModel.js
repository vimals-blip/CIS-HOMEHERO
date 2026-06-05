import pool from '../db.js';

export const AdminModel = {
  async getOverview() {
    const [
      [bookingsCount], [expertsCount], [customersCount],
      pendingRows, revenueRows, recentBookings, services, coupons,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM bookings').then(([r]) => r),
      pool.query('SELECT COUNT(*) AS count FROM experts').then(([r]) => r),
      pool.query("SELECT COUNT(*) AS count FROM user_roles WHERE role = 'CUSTOMER'").then(([r]) => r),
      pool.query(
        `SELECT e.id, e.bio, e.gender, e.experience_years, e.is_verified, e.onboarding_status, pr.name, pr.city, pr.avatar_url
         FROM experts e LEFT JOIN profiles pr ON pr.id = e.id
         WHERE e.is_verified = 0 ORDER BY e.created_at DESC LIMIT 20`,
      ).then(([r]) => r),
      pool.query('SELECT platform_fee, total_amount, status FROM bookings').then(([r]) => r),
      pool.query(
        `SELECT b.id, b.status, b.booking_type, b.scheduled_at, b.total_amount, b.address_snapshot,
           s.name AS service_name, ep.name AS expert_name, cust.name AS customer_name
         FROM bookings b
         LEFT JOIN services s ON s.id = b.service_id
         LEFT JOIN profiles ep ON ep.id = b.expert_id
         LEFT JOIN profiles cust ON cust.id = b.customer_id
         ORDER BY b.created_at DESC LIMIT 10`,
      ).then(([r]) => r),
      pool.query('SELECT * FROM services ORDER BY sort_order, name').then(([r]) => r),
      pool.query('SELECT * FROM coupons ORDER BY created_at DESC').then(([r]) => r),
    ]);

    const completed = (revenueRows ?? []).filter((r) => r.status === 'COMPLETED');
    return {
      counts: {
        bookings: Number(bookingsCount?.count ?? 0),
        experts: Number(expertsCount?.count ?? 0),
        customers: Number(customersCount?.count ?? 0),
      },
      pendingExperts: pendingRows ?? [],
      revenue: {
        totalRevenue: completed.reduce((s, r) => s + Number(r.platform_fee || 0), 0),
        gmv: completed.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      },
      recentBookings: recentBookings ?? [],
      services: services ?? [],
      coupons: coupons ?? [],
    };
  },
};
