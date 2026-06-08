import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const ServiceModel = {
  async findAll({ activeOnly = true } = {}) {
    return prisma.services.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  },

  async findById(id) {
    return prisma.services.findUnique({ where: { id } });
  },

  async findBySlug(slug) {
    return prisma.services.findUnique({ where: { slug } });
  },

  async create({ name, slug, tagline, description, iconName, imageUrl, ratePerHour, minHours, sortOrder }) {
    const id = `svc-${crypto.randomUUID()}`;
    await prisma.services.create({
      data: {
        id,
        name,
        slug,
        tagline: tagline ?? null,
        description: description ?? null,
        icon_name: iconName ?? null,
        image_url: imageUrl ?? null,
        rate_per_hour: ratePerHour ?? 0,
        min_hours: minHours ?? 1,
        sort_order: sortOrder ?? 0,
        is_active: true,
      },
    });
    return id;
  },

  async update(id, fields) {
    const map = {
      name: 'name', tagline: 'tagline', description: 'description', iconName: 'icon_name',
      imageUrl: 'image_url', ratePerHour: 'rate_per_hour', minHours: 'min_hours',
      sortOrder: 'sort_order', isActive: 'is_active',
    };
    const data = {};
    for (const [key, col] of Object.entries(map)) {
      if (fields[key] !== undefined) data[col] = fields[key];
    }
    if (!Object.keys(data).length) return;
    await prisma.services.update({ where: { id }, data });
  },
};
