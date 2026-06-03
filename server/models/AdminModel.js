import pool from '../db.js';

export const AdminModel = {
  async getOverview() {
    const [
      [bookingsCount], [providersCount], [customersCount],
      pendingRows, revenueRows, recentBookings, categories, coupons,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM bookings').then(([r]) => r),
      pool.query('SELECT COUNT(*) AS count FROM providers').then(([r]) => r),
      pool.query("SELECT COUNT(*) AS count FROM user_roles WHERE role = 'CUSTOMER'").then(([r]) => r),
      pool.query(
        `SELECT p.id, p.bio, p.experience_years, p.hourly_rate, p.is_verified, p.review_count, pr.name, pr.city
         FROM providers p LEFT JOIN profiles pr ON pr.id = p.id
         WHERE p.is_verified = 0 ORDER BY p.created_at DESC LIMIT 20`,
      ).then(([r]) => r),
      pool.query('SELECT platform_fee, total_amount, status FROM bookings').then(([r]) => r),
      pool.query(
        `SELECT b.id, b.status, b.scheduled_date, b.scheduled_time, b.total_amount, b.address,
           c.name AS category_name, pr.name AS provider_name, cust.name AS customer_name
         FROM bookings b
         LEFT JOIN categories c ON c.id = b.category_id
         LEFT JOIN profiles pr ON pr.id = b.provider_id
         LEFT JOIN profiles cust ON cust.id = b.customer_id
         ORDER BY b.created_at DESC LIMIT 10`,
      ).then(([r]) => r),
      pool.query('SELECT * FROM categories ORDER BY name').then(([r]) => r),
      pool.query('SELECT * FROM coupons ORDER BY created_at DESC').then(([r]) => r),
    ]);

    const completed = (revenueRows ?? []).filter((r) => r.status === 'COMPLETED');
    return {
      counts: {
        bookings: Number(bookingsCount?.count ?? 0),
        providers: Number(providersCount?.count ?? 0),
        customers: Number(customersCount?.count ?? 0),
      },
      pendingProviders: pendingRows ?? [],
      revenue: {
        totalRevenue: completed.reduce((s, r) => s + Number(r.platform_fee || 0), 0),
        gmv: completed.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      },
      recentBookings: recentBookings ?? [],
      categories: categories ?? [],
      coupons: coupons ?? [],
    };
  },
};
