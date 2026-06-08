import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const PaymentModel = {
  async create({ bookingId, amount, method = 'CASH', status }) {
    const id = `payment-${crypto.randomUUID()}`;
    const paidAt = status === 'PAID' ? new Date() : null;
    await prisma.payments.create({
      data: { id, booking_id: bookingId, amount, method, status, paid_at: paidAt },
    });
    return { id, bookingId, amount, method, status };
  },

  async findByBooking(bookingId) {
    return prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, customer_id: true },
    });
  },
};
