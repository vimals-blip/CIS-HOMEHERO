import { ServiceModel } from '../models/ServiceModel.js';
import { bustCache } from '../middleware/cache.js';
import { BadRequest, NotFound } from '../errors.js';

const SERVICES_CACHE_PREFIX = `${process.env.API_BASE_PATH || '/api/v1'}/services`;

function format(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    description: row.description,
    icon_name: row.icon_name,
    image_url: row.image_url,
    rate_per_hour: Number(row.rate_per_hour),
    min_hours: Number(row.min_hours),
    platform_fee_pct: Number(row.platform_fee_pct ?? 15),
    sort_order: row.sort_order,
    is_active: Boolean(row.is_active),
  };
}

export const serviceController = {
  async list(req, res) {
    const activeOnly = req.query.all !== 'true';
    const rows = await ServiceModel.findAll({ activeOnly });
    res.json(rows.map(format));
  },

  async getOne(req, res) {
    const row = await ServiceModel.findById(req.params.id);
    if (!row) throw NotFound('Service not found.');
    res.json(format(row));
  },

  // Admin
  async create(req, res) {
    const { name, slug, tagline, description, icon_name, image_url, rate_per_hour, min_hours, platform_fee_pct, sort_order } = req.body;
    if (!name || !slug || rate_per_hour == null) {
      throw BadRequest('MISSING_FIELDS', 'name, slug and rate_per_hour are required.');
    }
    const existing = await ServiceModel.findBySlug(slug);
    if (existing) throw BadRequest('SLUG_TAKEN', 'A service with this slug already exists.');
    const id = await ServiceModel.create({
      name, slug, tagline, description, iconName: icon_name, imageUrl: image_url,
      ratePerHour: rate_per_hour, minHours: min_hours, platformFeePct: platform_fee_pct,
      sortOrder: sort_order,
    });
    await bustCache(SERVICES_CACHE_PREFIX);
    res.status(201).json({ id });
  },

  // Admin
  async update(req, res) {
    const existing = await ServiceModel.findById(req.params.id);
    if (!existing) throw NotFound('Service not found.');
    const b = req.body;
    await ServiceModel.update(req.params.id, {
      name: b.name, tagline: b.tagline, description: b.description, iconName: b.icon_name,
      imageUrl: b.image_url, ratePerHour: b.rate_per_hour, minHours: b.min_hours,
      platformFeePct: b.platform_fee_pct, sortOrder: b.sort_order,
      isActive: b.is_active === undefined ? undefined : Boolean(b.is_active),
    });
    await bustCache(SERVICES_CACHE_PREFIX);
    res.json({ status: 'updated' });
  },

  // Super-admin
  async delete(req, res) {
    const existing = await ServiceModel.findById(req.params.id);
    if (!existing) throw NotFound('Service not found.');
    await ServiceModel.delete(req.params.id);
    await bustCache(SERVICES_CACHE_PREFIX);
    res.json({ status: 'deleted' });
  },
};
