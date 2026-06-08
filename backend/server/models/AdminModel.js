import prisma from '../prisma.js';

export const AdminModel = {
  async getOverview() {
    const [bookingsCount, expertsCount, customersCount, pendingExperts, revenueRows, recentBookings, services, coupons] =
      await Promise.all([
        prisma.bookings.count(),
        prisma.experts.count(),
        prisma.user_roles.count({ where: { role: 'CUSTOMER' } }),
        prisma.$queryRaw`
          SELECT e.id, e.bio, e.gender, e.experience_years, e.is_verified, e.onboarding_status,
            pr.name, pr.city, pr.avatar_url
          FROM experts e LEFT JOIN profiles pr ON pr.id = e.id
          WHERE e.is_verified = 0 ORDER BY e.created_at DESC LIMIT 20
        `,
        prisma.bookings.findMany({ select: { platform_fee: true, total_amount: true, status: true } }),
        prisma.$queryRaw`
          SELECT b.id, b.status, b.booking_type, b.scheduled_at, b.total_amount, b.address_snapshot,
            s.name AS service_name, ep.name AS expert_name, cust.name AS customer_name
          FROM bookings b
          LEFT JOIN services s ON s.id = b.service_id
          LEFT JOIN profiles ep ON ep.id = b.expert_id
          LEFT JOIN profiles cust ON cust.id = b.customer_id
          ORDER BY b.created_at DESC LIMIT 10
        `,
        prisma.services.findMany({ orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] }),
        prisma.coupons.findMany({ orderBy: { created_at: 'desc' } }),
      ]);

    const completed = (revenueRows ?? []).filter((r) => r.status === 'COMPLETED');
    return {
      counts: {
        bookings: Number(bookingsCount),
        experts: Number(expertsCount),
        customers: Number(customersCount),
      },
      pendingExperts: pendingExperts ?? [],
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
