import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

export const AuditModel = {
  async create({ actorId, actorEmail, actorRole, action, entityType, entityId, detail }) {
    await prisma.audit_logs.create({
      data: {
        id: `aud-${crypto.randomUUID()}`,
        actor_id: actorId ?? null,
        actor_email: actorEmail ?? null,
        actor_role: actorRole ?? null,
        action,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        detail: detail ?? null,
      },
    });
  },

  async list({ limit = 100, action } = {}) {
    const lim = Prisma.raw(String(parseInt(limit) || 100));
    if (action) {
      return prisma.$queryRaw`SELECT * FROM audit_logs WHERE action = ${action} ORDER BY created_at DESC LIMIT ${lim}`;
    }
    return prisma.$queryRaw`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${lim}`;
  },
};
