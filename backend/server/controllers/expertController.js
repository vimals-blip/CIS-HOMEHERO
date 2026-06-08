import { ExpertModel } from '../models/ExpertModel.js';
import prisma from '../prisma.js';
import { audit } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { isAdmin } from '../middleware/auth.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

const VALID_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY'];

function format(row) {
  return {
    id: row.id,
    name: row.name ?? 'Expert',
    avatar_url: row.avatar_url,
    city: row.city,
    gender: row.gender,
    bio: row.bio,
    experience_years: row.experience_years,
    avg_rating: Number(row.avg_rating || 0),
    review_count: row.review_count,
    total_jobs: row.total_jobs,
    is_verified: Boolean(row.is_verified),
    is_trained: Boolean(row.is_trained),
    status: row.status,
    onboarding_status: row.onboarding_status,
  };
}

export const expertController = {
  async list(req, res) {
    const { service_id, limit, page } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const rows = await ExpertModel.findList({
      serviceId: service_id, limit: safeLimit, offset: (safePage - 1) * safeLimit,
    });
    res.json(rows.map(format));
  },

  async getOne(req, res) {
    const row = await ExpertModel.findById(req.params.id);
    if (!row) throw NotFound('Expert not found.');
    const serviceIds = await ExpertModel.getServiceIds(req.params.id);
    res.json({ ...format(row), service_ids: serviceIds });
  },

  // Expert toggles their availability.
  async setStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) throw BadRequest('INVALID_STATUS', 'status must be ONLINE, OFFLINE, or BUSY.');
    if (req.user.id !== id && !isAdmin(req.user)) throw Forbidden();
    await ExpertModel.setStatus(id, status);
    res.json({ status: 'updated', expert_status: status });
  },

  async setLocation(req, res) {
    const { id } = req.params;
    const { lat, lng } = req.body;
    if (lat == null || lng == null) throw BadRequest('MISSING_FIELDS', 'lat and lng are required.');
    if (req.user.id !== id && !isAdmin(req.user)) throw Forbidden();
    await ExpertModel.setLocation(id, lat, lng);
    res.json({ status: 'updated' });
  },

  // Admin verifies/approves or rejects an expert.
  async setVerified(req, res) {
    const { is_verified } = req.body;
    if (typeof is_verified !== ‘boolean’) throw BadRequest(‘INVALID_BODY’, ‘is_verified must be a boolean.’);
    const expert = await ExpertModel.findById(req.params.id);
    if (!expert) throw NotFound(‘Expert not found.’);
    await ExpertModel.setVerified(req.params.id, is_verified);
    audit(req, is_verified ? ‘EXPERT_VERIFIED’ : ‘EXPERT_REJECTED’, { entityType: ‘expert’, entityId: req.params.id });
    await notify(req.params.id, is_verified
      ? { type: ‘expert_verified’, title: "You’re verified!", body: ‘Your profile is approved — go online to start receiving jobs.’ }
      : { type: ‘expert_rejected’, title: ‘Verification update’, body: ‘Your verification needs attention. Please review your KYC documents.’ });
    res.json({ status: ‘updated’, is_verified });
  },

  async updateProfile(req, res) {
    const { id } = req.params;
    if (req.user.id !== id && !isAdmin(req.user)) throw Forbidden();
    const { bio, gender, experience_years, avatar_url, name, city } = req.body;

    const profileData = {};
    if (name !== undefined) profileData.name = name;
    if (city !== undefined) profileData.city = city;
    if (avatar_url !== undefined) profileData.avatar_url = avatar_url;
    if (Object.keys(profileData).length) {
      await prisma.profiles.update({ where: { id }, data: profileData });
    }

    const expertData = {};
    if (bio !== undefined) expertData.bio = bio;
    if (gender !== undefined) expertData.gender = gender;
    if (experience_years !== undefined) expertData.experience_years = Number(experience_years);
    if (Object.keys(expertData).length) {
      await prisma.experts.update({ where: { id }, data: expertData });
    }

    res.json({ status: ‘updated’ });
  },
};
