import crypto from 'node:crypto';
import pool from '../db.js';

const VALID_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY'];

export const ProviderModel = {
  async findList({ categoryId, verified, limit, offset }) {
    const verifiedFilter =
      verified === 'true' ? 'AND p.is_verified = 1'
      : verified === 'false' ? 'AND p.is_verified = 0' : '';

    if (categoryId) {
      const [rows] = await pool.query(
        `SELECT p.*, pr.name AS profile_name, pr.avatar_url AS profile_avatar_url, pr.city AS profile_city,
           pc2.phone AS profile_phone, pc.custom_price, c.id AS category_id, c.name AS category_name
         FROM providers p
         JOIN provider_categories pc ON pc.provider_id = p.id
         LEFT JOIN profiles pr ON pr.id = p.id
         LEFT JOIN profile_contacts pc2 ON pc2.user_id = p.id
         LEFT JOIN categories c ON c.id = pc.category_id
         WHERE pc.category_id = ? ${verifiedFilter}
         ORDER BY p.avg_rating DESC, p.created_at DESC
         LIMIT ? OFFSET ?`,
        [categoryId, limit, offset],
      );
      return rows ?? [];
    }

    const [rows] = await pool.query(
      `SELECT p.*, pr.name AS profile_name, pr.avatar_url AS profile_avatar_url, pr.city AS profile_city,
         pc2.phone AS profile_phone
       FROM providers p
       LEFT JOIN profiles pr ON pr.id = p.id
       LEFT JOIN profile_contacts pc2 ON pc2.user_id = p.id
       WHERE 1=1 ${verifiedFilter}
       ORDER BY p.avg_rating DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return rows ?? [];
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, pr.name AS profile_name, pr.avatar_url AS profile_avatar_url, pr.city AS profile_city,
        pc_contact.phone AS profile_phone,
        pc.category_id, c.name AS category_name, pc.custom_price
       FROM providers p
       LEFT JOIN profiles pr ON pr.id = p.id
       LEFT JOIN profile_contacts pc_contact ON pc_contact.user_id = p.id
       LEFT JOIN provider_categories pc ON pc.provider_id = p.id
       LEFT JOIN categories c ON c.id = pc.category_id
       WHERE p.id = ?`,
      [id],
    );
    return rows.length > 0 ? rows : null;
  },

  async setVerified(id, isVerified) {
    await pool.query('UPDATE providers SET is_verified = ? WHERE id = ?', [Number(isVerified), id]);
  },

  async setStatus(id, status) {
    await pool.query('UPDATE providers SET status = ? WHERE id = ?', [status, id]);
  },

  async updateProfile(id, { name, city, phone, bio, experienceYears, hourlyRate }) {
    if (name !== undefined || city !== undefined) {
      const [existing] = await pool.query('SELECT id FROM profiles WHERE id = ?', [id]);
      if (existing.length === 0) {
        await pool.query('INSERT INTO profiles (id, name, city, created_at) VALUES (?, ?, ?, NOW())', [id, name ?? null, city ?? null]);
      } else {
        const cols = [], vals = [];
        if (name !== undefined) { cols.push('name = ?'); vals.push(name); }
        if (city !== undefined) { cols.push('city = ?'); vals.push(city); }
        if (cols.length) await pool.query(`UPDATE profiles SET ${cols.join(', ')} WHERE id = ?`, [...vals, id]);
      }
    }
    if (phone !== undefined) {
      await pool.query(
        'INSERT INTO profile_contacts (user_id, phone, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = VALUES(phone)',
        [id, phone],
      );
    }
    const cols = [], vals = [];
    if (bio !== undefined) { cols.push('bio = ?'); vals.push(bio); }
    if (experienceYears !== undefined) { cols.push('experience_years = ?'); vals.push(experienceYears); }
    if (hourlyRate !== undefined) { cols.push('hourly_rate = ?'); vals.push(hourlyRate); }
    if (cols.length) await pool.query(`UPDATE providers SET ${cols.join(', ')} WHERE id = ?`, [...vals, id]);
  },

  async addCategory(providerId, categoryId, customPrice) {
    await pool.query(
      'INSERT INTO provider_categories (provider_id, category_id, custom_price) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE custom_price = VALUES(custom_price)',
      [providerId, categoryId, customPrice ?? null],
    );
  },

  async findCategory(providerId, categoryId) {
    const [rows] = await pool.query(
      'SELECT provider_id FROM provider_categories WHERE provider_id = ? AND category_id = ?',
      [providerId, categoryId],
    );
    return rows[0] ?? null;
  },

  async updateCategoryPrice(providerId, categoryId, customPrice) {
    await pool.query(
      'UPDATE provider_categories SET custom_price = ? WHERE provider_id = ? AND category_id = ?',
      [customPrice, providerId, categoryId],
    );
  },

  async removeCategory(providerId, categoryId) {
    await pool.query('DELETE FROM provider_categories WHERE provider_id = ? AND category_id = ?', [providerId, categoryId]);
  },

  async getDocuments(providerId) {
    const [docs] = await pool.query(
      'SELECT id, type, file_url, status, created_at FROM provider_documents WHERE provider_id = ? ORDER BY created_at DESC',
      [providerId],
    );
    return docs ?? [];
  },

  async addDocument(providerId, { type, fileUrl }) {
    const id = `doc-${crypto.randomUUID()}`;
    await pool.query(
      'INSERT INTO provider_documents (id, provider_id, type, file_url, status, created_at) VALUES (?, ?, ?, ?, "PENDING", NOW())',
      [id, providerId, type, fileUrl],
    );
    return { id, type, status: 'PENDING' };
  },

  async findDocument(docId, providerId) {
    const [rows] = await pool.query('SELECT id FROM provider_documents WHERE id = ? AND provider_id = ?', [docId, providerId]);
    return rows[0] ?? null;
  },

  async updateDocumentStatus(docId, status) {
    await pool.query('UPDATE provider_documents SET status = ? WHERE id = ?', [status, docId]);
  },

  async deleteDocument(docId) {
    await pool.query('DELETE FROM provider_documents WHERE id = ?', [docId]);
  },

  async findAdminList({ isVerified, city, status, q, limit, offset }) {
    const filters = [], params = [];
    if (isVerified === 'true') filters.push('p.is_verified = 1');
    else if (isVerified === 'false') filters.push('p.is_verified = 0');
    if (city) { filters.push('pr.city = ?'); params.push(city); }
    if (status) { filters.push('p.status = ?'); params.push(status); }
    if (q) { filters.push('pr.name LIKE ?'); params.push(`%${q}%`); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT p.id, pr.name, pr.city, pc.phone, p.is_verified, p.avg_rating, p.review_count, p.hourly_rate, p.status, p.created_at
       FROM providers p
       LEFT JOIN profiles pr ON pr.id = p.id
       LEFT JOIN profile_contacts pc ON pc.user_id = p.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows ?? [];
  },
};
