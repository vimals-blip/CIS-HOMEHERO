import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const NotificationModel = {
  async create({ userId, type, title, body, bookingId }) {
    const id = `ntf-${crypto.randomUUID()}`;
    await prisma.notifications.create({
      data: { id, user_id: userId, type, title, body: body ?? null, booking_id: bookingId ?? null, is_read: false },
    });
    return id;
  },

  async listForUser(userId, limit = 30) {
    return prisma.notifications.findMany({
      where: { user_id: userId },
      select: { id: true, type: true, title: true, body: true, booking_id: true, is_read: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  },

  async unreadCount(userId) {
    return prisma.notifications.count({ where: { user_id: userId, is_read: false } });
  },

  async markRead(id, userId) {
    await prisma.notifications.updateMany({ where: { id, user_id: userId }, data: { is_read: true } });
  },

  async markAllRead(userId) {
    await prisma.notifications.updateMany({ where: { user_id: userId, is_read: false }, data: { is_read: true } });
  },

  async deviceTokens(userId) {
    const rows = await prisma.device_tokens.findMany({ where: { user_id: userId }, select: { token: true } });
    return rows.map((r) => r.token);
  },

  async saveDeviceToken(userId, token, platform = 'web') {
    await prisma.device_tokens.upsert({
      where: { token },
      create: { token, user_id: userId, platform },
      update: { user_id: userId, platform },
    });
  },
};
