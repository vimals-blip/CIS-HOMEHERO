import { CmsModel } from '../models/CmsModel.js';
import { BadRequest, NotFound } from '../errors.js';

export const cmsController = {
  // ── Public reads ────────────────────────────────────────────────────────────
  async banners(_req, res) {
    res.json(await CmsModel.listBanners({ activeOnly: true }));
  },
  async page(req, res) {
    const page = await CmsModel.getPage(req.params.slug);
    if (!page) throw NotFound('Page not found.');
    res.json(page);
  },
  async publicSettings(_req, res) {
    const rows = await CmsModel.getSettings({ publicOnly: true });
    res.json(Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value])));
  },
  async activeCities(_req, res) {
    res.json(await CmsModel.listCities({ activeOnly: true }));
  },

  // ── Admin / super-admin management ────────────────────────────────────────────
  async allBanners(_req, res) {
    res.json(await CmsModel.listBanners({ activeOnly: false }));
  },
  async createBanner(req, res) {
    const { title, image_url, link_url, sort_order } = req.body;
    if (!title || !image_url) throw BadRequest('MISSING_FIELDS', 'title and image_url are required.');
    const id = await CmsModel.createBanner({ title, imageUrl: image_url, linkUrl: link_url, sortOrder: sort_order });
    res.status(201).json({ id });
  },
  async toggleBanner(req, res) {
    if (typeof req.body.is_active !== 'boolean') throw BadRequest('INVALID_BODY', 'is_active must be a boolean.');
    await CmsModel.setBannerActive(req.params.id, req.body.is_active);
    res.json({ status: 'updated' });
  },
  async savePage(req, res) {
    const { title, body } = req.body;
    if (!title) throw BadRequest('MISSING_FIELDS', 'title is required.');
    await CmsModel.upsertPage({ slug: req.params.slug, title, body });
    res.json({ status: 'saved' });
  },

  async allSettings(_req, res) {
    res.json(await CmsModel.getSettings());
  },
  async saveSetting(req, res) {
    const { key, value, is_public } = req.body;
    if (!key) throw BadRequest('MISSING_FIELDS', 'key is required.');
    await CmsModel.setSetting(key, String(value ?? ''), Boolean(is_public));
    res.json({ status: 'saved' });
  },

  async allCities(_req, res) {
    res.json(await CmsModel.listCities());
  },
  async createCity(req, res) {
    if (!req.body.name) throw BadRequest('MISSING_FIELDS', 'name is required.');
    const id = await CmsModel.createCity({ name: req.body.name, state: req.body.state });
    res.status(201).json({ id });
  },
  async toggleCity(req, res) {
    if (typeof req.body.is_active !== 'boolean') throw BadRequest('INVALID_BODY', 'is_active must be a boolean.');
    await CmsModel.setCityActive(req.params.id, req.body.is_active);
    res.json({ status: 'updated' });
  },
};
