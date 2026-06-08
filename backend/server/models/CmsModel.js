import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const CmsModel = {
  async listBanners({ activeOnly = true } = {}) {
    return prisma.banners.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  },

  async createBanner({ title, imageUrl, linkUrl, sortOrder }) {
    const id = `ban-${crypto.randomUUID()}`;
    await prisma.banners.create({
      data: { id, title, image_url: imageUrl, link_url: linkUrl ?? null, sort_order: sortOrder ?? 0, is_active: true },
    });
    return id;
  },

  async setBannerActive(id, isActive) {
    await prisma.banners.update({ where: { id }, data: { is_active: isActive } });
  },

  async getPage(slug) {
    return prisma.cms_pages.findUnique({ where: { slug } });
  },

  async upsertPage({ slug, title, body }) {
    await prisma.cms_pages.upsert({
      where: { slug },
      create: { slug, title, body: body ?? null },
      update: { title, body: body ?? null },
    });
  },

  async getSettings({ publicOnly = false } = {}) {
    return prisma.settings.findMany({
      where: publicOnly ? { is_public: true } : undefined,
      select: { setting_key: true, setting_value: true, is_public: true },
    });
  },

  async setSetting(key, value, isPublic) {
    await prisma.settings.upsert({
      where: { setting_key: key },
      create: { setting_key: key, setting_value: value, is_public: isPublic ? true : false },
      update: { setting_value: value, is_public: isPublic ? true : false },
    });
  },

  async listCities({ activeOnly = false } = {}) {
    return prisma.cities.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { name: 'asc' },
    });
  },

  async createCity({ name, state }) {
    const id = `city-${crypto.randomUUID()}`;
    await prisma.cities.create({ data: { id, name, state: state ?? null, is_active: true } });
    return id;
  },

  async setCityActive(id, isActive) {
    await prisma.cities.update({ where: { id }, data: { is_active: isActive } });
  },
};
