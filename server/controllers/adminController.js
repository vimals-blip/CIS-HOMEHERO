import { AdminModel } from '../models/AdminModel.js';
import { ProviderModel } from '../models/ProviderModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { UserModel } from '../models/UserModel.js';
import { CouponModel } from '../models/CouponModel.js';
import { BadRequest, Conflict, NotFound } from '../errors.js';

export const adminController = {
  async getOverview(_req, res) {
    const data = await AdminModel.getOverview();
    res.json({
      bookings: data.counts.bookings,
      providers: data.counts.providers,
      customers: data.counts.customers,
      pending: data.pendingProviders.map((r) => ({
        id: r.id, bio: r.bio, experience_years: r.experience_years,
        hourly_rate: r.hourly_rate, is_verified: Boolean(r.is_verified),
        review_count: r.review_count, profiles: { name: r.name, city: r.city },
      })),
      totalRevenue: data.revenue.totalRevenue,
      gmv: data.revenue.gmv,
      recentBookings: data.recentBookings,
      categories: data.categories,
      coupons: data.coupons,
    });
  },

  async getProviders(req, res) {
    const { is_verified, city, status, q, limit, page } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const rows = await ProviderModel.findAdminList({
      isVerified: is_verified, city, status, q,
      limit: safeLimit, offset: (safePage - 1) * safeLimit,
    });
    res.json(rows.map((r) => ({
      id: r.id, name: r.name ?? 'Provider', city: r.city ?? null,
      phone: r.phone ?? null, is_verified: Boolean(r.is_verified),
      avg_rating: Number(r.avg_rating || 0), review_count: r.review_count ?? 0,
      hourly_rate: Number(r.hourly_rate || 0), status: r.status, created_at: r.created_at,
    })));
  },

  async getUsers(req, res) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const users = await UserModel.findAll({ limit: safeLimit, offset: (safePage - 1) * safeLimit });

    const result = await Promise.all(users.map(async (u) => {
      const profile = await UserModel.getProfile(u.id);
      return {
        id: u.id, email: u.email, is_verified: Boolean(u.is_verified),
        created_at: u.created_at, role: u.role,
        name: profile?.name ?? null, city: profile?.city ?? null, phone: profile?.phone ?? null,
      };
    }));
    res.json(result);
  },

  async getUserDetail(req, res) {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw NotFound('User not found.');
    const [profile, roles, provider] = await Promise.all([
      UserModel.getProfile(req.params.userId),
      UserModel.getRoles(req.params.userId),
      UserModel.getProviderInfo(req.params.userId),
    ]);
    res.json({
      id: user.id, email: user.email, is_verified: Boolean(user.is_verified),
      created_at: user.created_at, profile, roles, provider,
    });
  },

  async getBookings(req, res) {
    const { status, limit, page } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const rows = await BookingModel.findAll({ status, limit: safeLimit, offset: (safePage - 1) * safeLimit });
    res.json(rows.map((r) => ({
      ...r,
      total_amount: Number(r.total_amount),
      platform_fee: Number(r.platform_fee),
      provider_amount: Number(r.provider_amount),
    })));
  },

  async createCoupon(req, res) {
    const { code, type, value, max_uses, expires_at } = req.body;
    if (!code || !type || value == null) {
      throw BadRequest('MISSING_FIELDS', 'code, type and value are required.');
    }
    if (!['FLAT', 'PERCENT'].includes(type)) {
      throw BadRequest('INVALID_TYPE', 'type must be FLAT or PERCENT.');
    }
    const existing = await CouponModel.findByCode(code.toUpperCase());
    if (existing) throw Conflict('CODE_TAKEN', 'Coupon code already exists.');

    const coupon = await CouponModel.create({
      code: code.toUpperCase(), type, value,
      maxUses: max_uses ?? null, expiresAt: expires_at ?? null,
    });
    res.status(201).json(coupon);
  },

  async toggleCoupon(req, res) {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      throw BadRequest('INVALID_BODY', 'is_active must be a boolean.');
    }
    const existing = await CouponModel.findById(req.params.id);
    if (!existing) throw NotFound('Coupon not found.');
    await CouponModel.setActive(req.params.id, is_active);
    res.json({ status: 'updated', is_active });
  },
};
