import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const DocumentModel = {
  async listForExpert(expertId) {
    return prisma.expert_documents.findMany({
      where: { expert_id: expertId },
      select: { id: true, type: true, file_url: true, status: true, review_note: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  },

  async findById(id) {
    return prisma.expert_documents.findUnique({ where: { id } });
  },

  async upsert(expertId, type, fileUrl) {
    const existing = await prisma.expert_documents.findFirst({ where: { expert_id: expertId, type } });
    if (existing) {
      await prisma.expert_documents.update({
        where: { id: existing.id },
        data: { file_url: fileUrl, status: 'PENDING', review_note: null },
      });
      return existing.id;
    }
    const id = `doc-${crypto.randomUUID()}`;
    await prisma.expert_documents.create({
      data: { id, expert_id: expertId, type, file_url: fileUrl, status: 'PENDING' },
    });
    return id;
  },

  async setStatus(id, status, note) {
    await prisma.expert_documents.update({ where: { id }, data: { status, review_note: note ?? null } });
  },
};
