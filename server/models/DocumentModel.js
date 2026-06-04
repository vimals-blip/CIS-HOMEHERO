import crypto from 'node:crypto';
import pool from '../db.js';

export const DocumentModel = {
  async listForExpert(expertId) {
    const [rows] = await pool.query(
      'SELECT id, type, file_url, status, review_note, created_at FROM expert_documents WHERE expert_id = ? ORDER BY created_at DESC',
      [expertId],
    );
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM expert_documents WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  // One document per type per expert — re-uploading replaces the prior one.
  async upsert(expertId, type, fileUrl) {
    const [existing] = await pool.query('SELECT id FROM expert_documents WHERE expert_id = ? AND type = ?', [expertId, type]);
    if (existing[0]) {
      await pool.query(
        "UPDATE expert_documents SET file_url = ?, status = 'PENDING', review_note = NULL, updated_at = NOW() WHERE id = ?",
        [fileUrl, existing[0].id],
      );
      return existing[0].id;
    }
    const id = `doc-${crypto.randomUUID()}`;
    await pool.query(
      "INSERT INTO expert_documents (id, expert_id, type, file_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PENDING', NOW(), NOW())",
      [id, expertId, type, fileUrl],
    );
    return id;
  },

  async setStatus(id, status, note) {
    await pool.query('UPDATE expert_documents SET status = ?, review_note = ?, updated_at = NOW() WHERE id = ?', [status, note ?? null, id]);
  },
};
