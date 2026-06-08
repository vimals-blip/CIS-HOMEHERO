import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

export const WithdrawalModel = {
  async create({ expertId, amount, bankAccount, bankIfsc }) {
    const id = `wd-${crypto.randomUUID()}`;
    await prisma.withdrawal_requests.create({
      data: { id, expert_id: expertId, amount, status: 'REQUESTED', bank_account: bankAccount ?? null, bank_ifsc: bankIfsc ?? null },
    });
    return id;
  },

  async findById(id) {
    return prisma.withdrawal_requests.findUnique({ where: { id } });
  },

  async listForExpert(expertId) {
    const rows = await prisma.withdrawal_requests.findMany({
      where: { expert_id: expertId },
      orderBy: { requested_at: 'desc' },
    });
    return rows.map((w) => ({ ...w, amount: Number(w.amount) }));
  },

  async listAll(status) {
    const lim = Prisma.raw('100');
    let rows;
    if (status) {
      rows = await prisma.$queryRaw`
        SELECT w.*, pr.name AS expert_name
        FROM withdrawal_requests w
        LEFT JOIN profiles pr ON pr.id = w.expert_id
        WHERE w.status = ${status}
        ORDER BY w.requested_at DESC LIMIT ${lim}
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT w.*, pr.name AS expert_name
        FROM withdrawal_requests w
        LEFT JOIN profiles pr ON pr.id = w.expert_id
        ORDER BY w.requested_at DESC LIMIT ${lim}
      `;
    }
    return (rows ?? []).map((w) => ({ ...w, amount: Number(w.amount) }));
  },

  async setStatus(id, status) {
    await prisma.withdrawal_requests.update({ where: { id }, data: { status, processed_at: new Date() } });
  },
};
