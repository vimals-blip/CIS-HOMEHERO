import crypto from 'node:crypto';
import pool from '../db.js';

const TICKET_SELECT = `
  SELECT t.*, p.name AS user_name,
    (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
  FROM support_tickets t
  LEFT JOIN profiles p ON p.id = t.user_id
`;

export const SupportModel = {
  async createTicket({ userId, subject, category, priority, bookingId }) {
    const id = `tkt-${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO support_tickets (id, user_id, booking_id, subject, category, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NOW(), NOW())`,
      [id, userId, bookingId ?? null, subject, category ?? 'GENERAL', priority ?? 'MEDIUM'],
    );
    return id;
  },

  async findById(id) {
    const [rows] = await pool.query(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async listForUser(userId) {
    const [rows] = await pool.query(`${TICKET_SELECT} WHERE t.user_id = ? ORDER BY t.updated_at DESC`, [userId]);
    return rows ?? [];
  },

  async listAll(status) {
    const params = [];
    let where = '';
    if (status) { where = 'WHERE t.status = ?'; params.push(status); }
    const [rows] = await pool.query(`${TICKET_SELECT} ${where} ORDER BY t.updated_at DESC LIMIT 100`, params);
    return rows ?? [];
  },

  async setStatus(id, status) {
    await pool.query('UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },

  async addMessage(ticketId, senderId, body, isStaff) {
    const id = `msg-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO ticket_messages (id, ticket_id, sender_id, is_staff, body, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, ticketId, senderId, isStaff ? 1 : 0, body],
    );
    await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [ticketId]);
    return id;
  },

  async messages(ticketId) {
    const [rows] = await pool.query(
      `SELECT m.id, m.sender_id, m.is_staff, m.body, m.created_at, p.name AS sender_name
       FROM ticket_messages m LEFT JOIN profiles p ON p.id = m.sender_id
       WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
      [ticketId],
    );
    return rows ?? [];
  },
};
