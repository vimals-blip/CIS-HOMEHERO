import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const PaymentTxnModel = {
  async create({ userId, bookingId, orderId, amount, purpose, provider }) {
    const id = `ptxn-${crypto.randomUUID()}`;
    await prisma.payment_transactions.create({
      data: { id, user_id: userId, booking_id: bookingId ?? null, order_id: orderId, amount, purpose, provider, status: 'CREATED' },
    });
    return id;
  },

  async findByOrderId(orderId) {
    return prisma.payment_transactions.findFirst({ where: { order_id: orderId } });
  },

  async markPaid(id, paymentId, signature) {
    await prisma.payment_transactions.update({
      where: { id },
      data: { status: 'PAID', payment_id: paymentId, signature: signature ?? null },
    });
  },

  async markFailed(id) {
    await prisma.payment_transactions.update({ where: { id }, data: { status: 'FAILED' } });
  },
};
