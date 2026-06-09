import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

const TICKET_SELECT = Prisma.sql`
  SELECT t.*, p.name AS user_name,
    CAST((SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS SIGNED) AS message_count
  FROM support_tickets t
  LEFT JOIN profiles p ON p.id = t.user_id
`;

function fmtTicket(t) {
  return { ...t, message_count: Number(t.message_count ?? 0) };
}
function fmtMessage(m) {
  return { ...m, is_staff: Boolean(m.is_staff) };
}

export const SupportModel = {
  async createTicket({ userId, subject, category, priority, bookingId }) {
    const id = `tkt-${crypto.randomUUID()}`;
    await prisma.support_tickets.create({
      data: {
        id,
        user_id: userId,
        booking_id: bookingId ?? null,
        subject,
        category: category ?? 'GENERAL',
        priority: priority ?? 'MEDIUM',
        status: 'OPEN',
      },
    });
    return id;
  },

  async findById(id) {
    const rows = await prisma.$queryRaw`${TICKET_SELECT} WHERE t.id = ${id}`;
    return rows[0] ? fmtTicket(rows[0]) : null;
  },

  async listForUser(userId) {
    const rows = await prisma.$queryRaw`${TICKET_SELECT} WHERE t.user_id = ${userId} ORDER BY t.updated_at DESC`;
    return rows.map(fmtTicket);
  },

  async listAll(status) {
    const lim = Prisma.raw('100');
    const rows = status
      ? await prisma.$queryRaw`${TICKET_SELECT} WHERE t.status = ${status} ORDER BY t.updated_at DESC LIMIT ${lim}`
      : await prisma.$queryRaw`${TICKET_SELECT} ORDER BY t.updated_at DESC LIMIT ${lim}`;
    return rows.map(fmtTicket);
  },

  async setStatus(id, status) {
    await prisma.support_tickets.update({ where: { id }, data: { status } });
  },

  async addMessage(ticketId, senderId, body, isStaff) {
    const id = `msg-${crypto.randomUUID()}`;
    await prisma.ticket_messages.create({
      data: { id, ticket_id: ticketId, sender_id: senderId, is_staff: isStaff ? true : false, body },
    });
    await prisma.support_tickets.update({ where: { id: ticketId }, data: { updated_at: new Date() } });
    return id;
  },

  async messages(ticketId) {
    const rows = await prisma.$queryRaw`
      SELECT m.id, m.sender_id, m.is_staff, m.body, m.created_at, p.name AS sender_name
      FROM ticket_messages m LEFT JOIN profiles p ON p.id = m.sender_id
      WHERE m.ticket_id = ${ticketId} ORDER BY m.created_at ASC
    `;
    return rows.map(fmtMessage);
  },
};
