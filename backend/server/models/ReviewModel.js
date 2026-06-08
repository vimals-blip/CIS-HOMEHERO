import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const ReviewModel = {
  async findByExpert(expertId) {
    return prisma.$queryRaw`
      SELECT r.id, r.rating, r.comment, r.created_at, p.name AS customer_name
      FROM reviews r
      LEFT JOIN profiles p ON p.id = r.customer_id
      WHERE r.expert_id = ${expertId}
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
  },

  async findByBooking(bookingId) {
    return prisma.reviews.findUnique({ where: { booking_id: bookingId }, select: { id: true } });
  },

  async create({ bookingId, expertId, customerId, rating, comment }) {
    const id = `review-${crypto.randomUUID()}`;
    await prisma.reviews.create({
      data: { id, booking_id: bookingId, expert_id: expertId, customer_id: customerId, rating, comment: comment ?? null },
    });
    return id;
  },
};
