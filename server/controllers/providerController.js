import { ProviderModel } from '../models/ProviderModel.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';
import { maskPhone } from '../utils.js';

const VALID_DOC_TYPES = ['AADHAAR', 'PAN', 'BANK'];
const VALID_DOC_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const VALID_PROVIDER_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY'];

function formatProviderRow(row) {
  return {
    id: row.id,
    name: row.profile_name ?? 'Provider',
    avatar_url: row.profile_avatar_url,
    city: row.profile_city,
    phone: row.profile_phone ?? null,
    bio: row.bio,
    experience_years: row.experience_years,
    hourly_rate: Number(row.custom_price ?? row.hourly_rate ?? 0),
    is_verified: Boolean(row.is_verified),
    avg_rating: Number(row.avg_rating || 0),
    review_count: row.review_count,
    status: row.status,
    category_id: row.category_id,
    category_name: row.category_name,
  };
}

export const providerController = {
  async list(req, res) {
    const { category_id, verified, limit, page } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const rows = await ProviderModel.findList({
      categoryId: category_id,
      verified,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });
    res.json(rows.map(formatProviderRow));
  },

  async getOne(req, res) {
    const rows = await ProviderModel.findById(req.params.id);
    if (!rows) throw NotFound('Provider not found.');
    const first = rows[0];
    res.json({
      id: first.id,
      bio: first.bio,
      experience_years: first.experience_years,
      hourly_rate: Number(first.hourly_rate),
      is_verified: Boolean(first.is_verified),
      avg_rating: Number(first.avg_rating || 0),
      review_count: first.review_count,
      status: first.status,
      profiles: {
        name: first.profile_name,
        avatar_url: first.profile_avatar_url,
        city: first.profile_city,
        phone: maskPhone(first.profile_phone),
      },
      provider_categories: rows
        .filter((r) => r.category_id)
        .map((r) => ({
          custom_price: Number(r.custom_price ?? r.hourly_rate),
          categories: { id: r.category_id, name: r.category_name },
        })),
    });
  },

  async setVerified(req, res) {
    const { is_verified } = req.body;
    if (typeof is_verified !== 'boolean') throw BadRequest('INVALID_BODY', 'is_verified must be a boolean.');
    await ProviderModel.setVerified(req.params.id, is_verified);
    res.json({ status: 'updated', is_verified });
  },

  async setStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_PROVIDER_STATUSES.includes(status)) {
      throw BadRequest('INVALID_STATUS', 'status must be ONLINE, OFFLINE, or BUSY.');
    }
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    await ProviderModel.setStatus(id, status);
    res.json({ status: 'updated', provider_status: status });
  },

  async updateProfile(req, res) {
    const { id } = req.params;
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden('You can only edit your own profile.');
    const { name, city, bio, experience_years, hourly_rate, phone } = req.body;
    await ProviderModel.updateProfile(id, { name, city, phone, bio, experienceYears: experience_years, hourlyRate: hourly_rate });
    res.json({ status: 'updated' });
  },

  async addCategory(req, res) {
    const { id } = req.params;
    const { category_id, custom_price } = req.body;
    if (!category_id) throw BadRequest('MISSING_FIELDS', 'category_id is required.');
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    await ProviderModel.addCategory(id, category_id, custom_price);
    res.status(201).json({ status: 'added', provider_id: id, category_id });
  },

  async updateCategory(req, res) {
    const { id, categoryId } = req.params;
    const { custom_price } = req.body;
    if (custom_price == null) throw BadRequest('MISSING_FIELDS', 'custom_price is required.');
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    const existing = await ProviderModel.findCategory(id, categoryId);
    if (!existing) throw NotFound('Service not found.');
    await ProviderModel.updateCategoryPrice(id, categoryId, custom_price);
    res.json({ status: 'updated', custom_price });
  },

  async removeCategory(req, res) {
    const { id, categoryId } = req.params;
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    const existing = await ProviderModel.findCategory(id, categoryId);
    if (!existing) throw NotFound('Service not found.');
    await ProviderModel.removeCategory(id, categoryId);
    res.json({ status: 'deleted' });
  },

  async getDocuments(req, res) {
    const { id } = req.params;
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    const docs = await ProviderModel.getDocuments(id);
    res.json(docs);
  },

  async addDocument(req, res) {
    const { id } = req.params;
    const { type, file_url } = req.body;
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    if (!type || !file_url) throw BadRequest('MISSING_FIELDS', 'type and file_url are required.');
    if (!VALID_DOC_TYPES.includes(type)) throw BadRequest('INVALID_TYPE', 'type must be AADHAAR, PAN, or BANK.');
    const doc = await ProviderModel.addDocument(id, { type, fileUrl: file_url });
    res.status(201).json(doc);
  },

  async updateDocument(req, res) {
    const { id, docId } = req.params;
    const { status } = req.body;
    if (!VALID_DOC_STATUSES.includes(status)) {
      throw BadRequest('INVALID_STATUS', 'status must be PENDING, APPROVED, or REJECTED.');
    }
    const existing = await ProviderModel.findDocument(docId, id);
    if (!existing) throw NotFound('Document not found.');
    await ProviderModel.updateDocumentStatus(docId, status);
    res.json({ status: 'updated', document_status: status });
  },

  async deleteDocument(req, res) {
    const { id, docId } = req.params;
    if (req.user.id !== id && req.user.role !== 'ADMIN') throw Forbidden();
    const existing = await ProviderModel.findDocument(docId, id);
    if (!existing) throw NotFound('Document not found.');
    await ProviderModel.deleteDocument(docId);
    res.json({ status: 'deleted' });
  },
};
