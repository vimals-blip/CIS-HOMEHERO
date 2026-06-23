import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

const PUBLIC_SELECT = Prisma.sql`
  SELECT e.*, pr.name, pr.avatar_url, pr.city
  FROM experts e
  LEFT JOIN profiles pr ON pr.id = e.id
  JOIN users u ON u.id = e.id
`;

export const ExpertModel = {
  async findList({ serviceId, limit, offset }) {
    const lim = Prisma.raw(String(parseInt(limit) || 20));
    const off = Prisma.raw(String(parseInt(offset) || 0));
    if (serviceId) {
      return prisma.$queryRaw`
        ${PUBLIC_SELECT}
        JOIN expert_services es ON es.expert_id = e.id
        WHERE e.is_verified = 1 AND u.is_blocked = 0 AND es.service_id = ${serviceId}
        ORDER BY e.avg_rating DESC, e.total_jobs DESC
        LIMIT ${lim} OFFSET ${off}
      `;
    }
    return prisma.$queryRaw`
      ${PUBLIC_SELECT}
      WHERE e.is_verified = 1 AND u.is_blocked = 0
      ORDER BY e.avg_rating DESC, e.total_jobs DESC
      LIMIT ${lim} OFFSET ${off}
    `;
  },

  async findById(id) {
    const rows = await prisma.$queryRaw`${PUBLIC_SELECT} WHERE e.id = ${id}`;
    return rows[0] ?? null;
  },

  async getServiceIds(expertId) {
    const rows = await prisma.expert_services.findMany({
      where: { expert_id: expertId },
      select: { service_id: true },
    });
    return rows.map((r) => r.service_id);
  },

  async findAvailableForService(serviceId) {
    const online = await prisma.$queryRaw`
      SELECT e.* FROM experts e
      JOIN expert_services es ON es.expert_id = e.id
      JOIN users u ON u.id = e.id
      WHERE es.service_id = ${serviceId} AND e.is_verified = 1 AND e.status = 'ONLINE' AND u.is_blocked = 0
      ORDER BY e.avg_rating DESC, e.total_jobs DESC
      LIMIT 1
    `;
    if (online[0]) return online[0];

    const any = await prisma.$queryRaw`
      SELECT e.* FROM experts e
      JOIN expert_services es ON es.expert_id = e.id
      JOIN users u ON u.id = e.id
      WHERE es.service_id = ${serviceId} AND e.is_verified = 1 AND e.status <> 'BUSY' AND u.is_blocked = 0
      ORDER BY e.avg_rating DESC, e.total_jobs DESC
      LIMIT 1
    `;
    return any[0] ?? null;
  },

  async findCandidatesForService(serviceId) {
    return prisma.$queryRaw`
      SELECT e.id, e.avg_rating, e.current_lat, e.current_lng, e.status,
        (SELECT COUNT(*) FROM bookings b
          WHERE b.expert_id = e.id
            AND b.status IN ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')) AS active_jobs
      FROM experts e
      JOIN expert_services es ON es.expert_id = e.id
      JOIN users u ON u.id = e.id
      WHERE es.service_id = ${serviceId} AND e.is_verified = 1 AND e.status = 'ONLINE' AND u.is_blocked = 0
    `;
  },

  async earningsHistory(expertId, limit = 50) {
    const lim = Prisma.raw(String(parseInt(limit) || 50));
    const rows = await prisma.$queryRaw`
      SELECT b.id, b.total_amount, b.expert_amount, b.completed_at, b.created_at,
        s.name AS service_name, cust.name AS customer_name
      FROM bookings b
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN profiles cust ON cust.id = b.customer_id
      WHERE b.expert_id = ${expertId} AND b.status = 'COMPLETED'
      ORDER BY b.completed_at DESC, b.created_at DESC LIMIT ${lim}
    `;
    return (rows ?? []).map((r) => ({ ...r, total_amount: Number(r.total_amount), expert_amount: Number(r.expert_amount) }));
  },

  async setStatus(id, status) {
    await prisma.experts.update({ where: { id }, data: { status } });
    if (status === 'ONLINE') {
      // Immediately dispatch any SEARCHING bookings that match this expert's services.
      // This is critical: when an expert was offline during booking, the retry queue
      // may have exhausted its attempts. We must re-dispatch immediately — no delay.
      (async () => {
        try {
          const serviceIds = await ExpertModel.getServiceIds(id);
          if (!serviceIds || serviceIds.length === 0) return;

          const searchingBookings = await prisma.bookings.findMany({
            where: {
              status: 'SEARCHING',
              service_id: { in: serviceIds },
            },
            select: { id: true },
            orderBy: { created_at: 'asc' }, // oldest bookings first (FIFO fairness)
          });

          if (searchingBookings.length > 0) {
            console.log(`[dispatch] Expert ${id} came ONLINE — ${searchingBookings.length} SEARCHING booking(s) found, dispatching immediately.`);
            const { dispatchService } = await import('../services/dispatchService.js');
            for (const b of searchingBookings) {
              // dispatchImmediate runs the assign logic synchronously (no 8s delay).
              // Once the first booking grabs this expert, subsequent ones will find
              // no candidates and fall through gracefully.
              await dispatchService.dispatchImmediate(b.id);
            }
          }
        } catch (err) {
          console.error('[dispatch] Failed to trigger dispatches for newly online expert:', err);
        }
      })();
    }
  },

  async setLocation(id, lat, lng) {
    await prisma.experts.update({ where: { id }, data: { current_lat: lat, current_lng: lng } });
  },

  async setVerified(id, isVerified) {
    await prisma.experts.update({
      where: { id },
      data: {
        is_verified: isVerified,
        is_trained: isVerified,
        onboarding_status: isVerified ? 'APPROVED' : 'REJECTED',
      },
    });
  },

  async incrementJobs(id) {
    await prisma.experts.update({ where: { id }, data: { total_jobs: { increment: 1 } } });
  },

  async recalcStats(expertId) {
    const stats = await prisma.reviews.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { expert_id: expertId },
    });
    await prisma.experts.update({
      where: { id: expertId },
      data: {
        avg_rating: Number(stats._avg.rating ?? 0).toFixed(2),
        review_count: stats._count.rating ?? 0,
      },
    });
  },

  async findAdminList({ isVerified, status, q, limit, offset }) {
    const filters = [];
    if (isVerified === 'true') filters.push(Prisma.sql`e.is_verified = 1`);
    else if (isVerified === 'false') filters.push(Prisma.sql`e.is_verified = 0`);
    if (status) filters.push(Prisma.sql`e.status = ${status}`);
    if (q) filters.push(Prisma.sql`pr.name LIKE ${`%${q}%`}`);
    const where = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;
    const lim = Prisma.raw(String(parseInt(limit) || 20));
    const off = Prisma.raw(String(parseInt(offset) || 0));
    return prisma.$queryRaw`${PUBLIC_SELECT} ${where} ORDER BY e.created_at DESC LIMIT ${lim} OFFSET ${off}`;
  },
};
