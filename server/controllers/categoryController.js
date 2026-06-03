import { CategoryModel } from '../models/CategoryModel.js';
import { BadRequest, NotFound } from '../errors.js';

export const categoryController = {
  async getAll(_req, res) {
    const categories = await CategoryModel.findAll();
    res.json(categories);
  },

  async getOne(req, res) {
    const category = await CategoryModel.findById(req.params.id);
    if (!category) throw NotFound('Category not found.');
    res.json(category);
  },

  async create(req, res) {
    const { name, base_price, commission_pct, icon_name } = req.body;
    if (!name) throw BadRequest('MISSING_FIELDS', 'name is required.');
    const category = await CategoryModel.create({
      name,
      basePrice: base_price,
      commissionPct: commission_pct,
      iconName: icon_name,
    });
    res.status(201).json(category);
  },

  async toggle(req, res) {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') throw BadRequest('INVALID_BODY', 'is_active must be a boolean.');
    await CategoryModel.setActive(req.params.id, is_active);
    res.json({ status: 'updated', is_active });
  },
};
