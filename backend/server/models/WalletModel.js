import crypto from 'node:crypto';
import prisma from '../prisma.js';

async function ledger(userId, bookingId, type, amount, description, tx = prisma) {
  await tx.transactions.create({
    data: {
      id: `txn-${crypto.randomUUID()}`,
      user_id: userId,
      booking_id: bookingId ?? null,
      type,
      amount,
      description: description ?? null,
    },
  });
}

export const WalletModel = {
  async findByExpert(expertId) {
    const row = await prisma.expert_wallet.findUnique({ where: { expert_id: expertId } });
    if (!row) return { expert_id: expertId, pending_balance: 0, available_balance: 0, total_earned: 0 };
    return {
      expert_id: row.expert_id,
      pending_balance: Number(row.pending_balance),
      available_balance: Number(row.available_balance),
      total_earned: Number(row.total_earned),
    };
  },

  async credit(expertId, amount) {
    await prisma.expert_wallet.upsert({
      where: { expert_id: expertId },
      create: { expert_id: expertId, available_balance: amount, total_earned: amount },
      update: {
        available_balance: { increment: amount },
        total_earned: { increment: amount },
      },
    });
  },

  async debitExpert(expertId, amount) {
    await prisma.expert_wallet.update({
      where: { expert_id: expertId },
      data: { available_balance: { decrement: amount } },
    });
  },

  async creditExpertAvailable(expertId, amount) {
    await prisma.expert_wallet.update({
      where: { expert_id: expertId },
      data: { available_balance: { increment: amount } },
    });
  },

  async getCustomer(userId) {
    const row = await prisma.customer_wallet.findUnique({ where: { user_id: userId } });
    if (!row) return { user_id: userId, balance: 0, total_added: 0, total_spent: 0 };
    return { user_id: row.user_id, balance: Number(row.balance), total_added: Number(row.total_added), total_spent: Number(row.total_spent) };
  },

  async ensureCustomer(userId, tx = prisma) {
    await tx.customer_wallet.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {},
    });
  },

  async topUp(userId, amount, description = 'Wallet top-up') {
    await this.ensureCustomer(userId);
    await prisma.customer_wallet.update({
      where: { user_id: userId },
      data: { balance: { increment: amount }, total_added: { increment: amount } },
    });
    await ledger(userId, null, 'CREDIT', amount, description);
    return this.getCustomer(userId);
  },

  async debitWithConn(tx, userId, amount, bookingId, description) {
    await tx.customer_wallet.update({
      where: { user_id: userId },
      data: { balance: { decrement: amount }, total_spent: { increment: amount } },
    });
    await ledger(userId, bookingId ?? null, 'DEBIT', amount, description ?? 'Booking payment', tx);
  },

  async refund(userId, amount, bookingId, description = 'Refund') {
    await this.ensureCustomer(userId);
    await prisma.$executeRaw`
      UPDATE customer_wallet
      SET balance = balance + ${amount}, total_spent = GREATEST(0, total_spent - ${amount})
      WHERE user_id = ${userId}
    `;
    await ledger(userId, bookingId, 'CREDIT', amount, description);
  },

  async transactionsForUser(userId, limit = 30) {
    const rows = await prisma.transactions.findMany({
      where: { user_id: userId },
      select: { id: true, booking_id: true, type: true, amount: true, description: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return rows.map((t) => ({ ...t, amount: Number(t.amount) }));
  },
};
