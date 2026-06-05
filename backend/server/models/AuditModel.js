import crypto from 'node:crypto';
import pool from '../db.js';

export const AuditModel = {
  async create({ actorId, actorEmail, actorRole, action, entityType, entityId, detail }) {
    const id = `aud-${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, entity_type, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, actorId ?? null, actorEmail ?? null, actorRole ?? null, action, entityType ?? null, entityId ?? null, detail ?? null],
    );
  },

  async list({ limit = 100, action } = {}) {
    const params = [];
    let where = '';
    if (action) { where = 'WHERE action = ?'; params.push(action); }
    const [rows] = await pool.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows ?? [];
  },
};
