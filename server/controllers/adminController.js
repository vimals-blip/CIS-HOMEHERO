import { AdminModel } from '../models/AdminModel.js';
import { ExpertModel } from '../models/ExpertModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { UserModel } from '../models/UserModel.js';
import { CouponModel } from '../models/CouponModel.js';
import { WithdrawalModel } from '../models/WithdrawalModel.js';
import { WalletModel } from '../models/WalletModel.js';
import { BadRequest, Conflict, NotFound } from '../errors.js';

export const adminController = {
  async getOverview(_req, res) {
    const data = await AdminModel.getOverview();
    res.json({
      bookings: data.counts.bookings,
      experts: data.counts.experts,
      customers: data.counts.customers,
      pending: data.pendingExperts.map((r) => ({
        id: r.id, bio: r.bio, gender: r.gender, experience_years: r.experience_years,
        is_verified: Boolean(r.is_verified), onboarding_status: r.onboarding_status,
        profiles: { name: r.name, city: r.city, avatar_url: r.avatar_url },
      })),
      totalRevenue: data.revenue.totalRevenue,
      gmv: data.revenue.gmv,
      recentBookings: data.recentBookings,
      services: data.services,
      coupons: data.coupons,
    });
  },

  async getExperts(req, res) {
    const { is_verified, status, q, limit, page } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const rows = await ExpertModel.findAdminList({
      isVerified: is_verified, status, q,
      limit: safeLimit, offset: (safePage - 1) * safeLimit,
    });
    res.json(rows.map((r) => ({
      id: r.id, name: r.name ?? 'Expert', city: r.city ?? null, gender: r.gender,
      avatar_url: r.avatar_url ?? null,
      is_verified: Boolean(r.is_verified), avg_rating: Number(r.avg_rating || 0),
      review_count: r.review_count ?? 0, total_jobs: r.total_jobs ?? 0,
      status: r.status, onboarding_status: r.onboarding_status, created_at: r.created_at,
    })));
  },

  async getUsers(req, res) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const users = await UserModel.findAll({
      limit: safeLimit, offset: (safePage - 1) * safeLimit,
      q: req.query.q, role: req.query.role,
    });
    // findAll now joins profiles, so no N+1 per-user lookup needed.
    res.json(users.map((u) => ({
      id: u.id, email: u.email,
      is_verified: Boolean(u.is_verified), is_blocked: Boolean(u.is_blocked),
      created_at: u.created_at, role: u.role,
      name: u.name ?? null, city: u.city ?? null, phone: u.phone ?? null, avatar_url: u.avatar_url ?? null,
    })));
  },

  async getUserDetail(req, res) {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw NotFound('User not found.');
    const [profile, roles, expert, bookings, stats, transactions] = await Promise.all([
      UserModel.getProfile(req.params.userId),
      UserModel.getRoles(req.params.userId),
      UserModel.getExpertInfo(req.params.userId),
      UserModel.bookingsForUser(req.params.userId),
      UserModel.statsForUser(req.params.userId),
      WalletModel.transactionsForUser(req.params.userId, 20),
    ]);
    res.json({
      id: user.id, email: user.email,
      is_verified: Boolean(user.is_verified), is_blocked: Boolean(user.is_blocked),
      created_at: user.created_at, profile, roles, expert, bookings, stats, transactions,
    });
  },

  // Edit a user's profile and/or block status.
  async updateUser(req, res) {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw NotFound('User not found.');
    const { name, phone, city, is_blocked } = req.body;
    await UserModel.updateProfile(req.params.userId, { name, phone, city });
    if (typeof is_blocked === 'boolean') {
      if (req.params.userId === req.user.id) throw BadRequest('SELF', 'You cannot block your own account.');
      await UserModel.setBlocked(req.params.userId, is_blocked);
    }
    res.json({ status: 'updated' });
  },

  // Hard-delete a user (super-admin only — enforced by the route).
  async deleteUser(req, res) {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw NotFound('User not found.');
    if (req.params.userId === req.user.id) throw BadRequest('SELF', 'You cannot delete your own account.');
    const roles = await UserModel.getRoles(req.params.userId);
    if (roles.includes('SUPER_ADMIN')) throw BadRequest('PROTECTED', 'Cannot delete a super admin.');
    await UserModel.remove(req.params.userId);
    res.json({ status: 'deleted' });
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
      expert_amount: Number(r.expert_amount),
    })));
  },

  async createCoupon(req, res) {
    const { code, type, value, max_uses, expires_at } = req.body;
    if (!code || !type || value == null) throw BadRequest('MISSING_FIELDS', 'code, type and value are required.');
    if (!['FLAT', 'PERCENT'].includes(type)) throw BadRequest('INVALID_TYPE', 'type must be FLAT or PERCENT.');
    const existing = await CouponModel.findByCode(code.toUpperCase());
    if (existing) throw Conflict('CODE_TAKEN', 'Coupon code already exists.');
    const coupon = await CouponModel.create({
      code: code.toUpperCase(), type, value, maxUses: max_uses ?? null, expiresAt: expires_at ?? null,
    });
    res.status(201).json(coupon);
  },

  // ── Admin management (super-admin only) ───────────────────────────────────
  async listAdmins(_req, res) {
    res.json(await UserModel.listAdmins());
  },

  async promoteAdmin(req, res) {
    const { user_id, email, role = 'ADMIN' } = req.body;
    if (!['ADMIN', 'SUPER_ADMIN', 'CUSTOMER'].includes(role)) throw BadRequest('INVALID_ROLE', 'Invalid role.');
    let target = user_id;
    if (!target && email) {
      const u = await UserModel.findByEmail(email);
      if (!u) throw NotFound('No user with that email.');
      target = u.id;
    }
    if (!target) throw BadRequest('MISSING_FIELDS', 'user_id or email is required.');
    if (target === req.user.id) throw BadRequest('SELF', 'You cannot change your own role.');
    await UserModel.setRole(target, role);
    res.json({ status: 'updated', user_id: target, role });
  },

  async getWithdrawals(req, res) {
    const { status } = req.query;
    res.json(await WithdrawalModel.listAll(status));
  },

  // Approve / reject / mark-paid a withdrawal. Rejection returns funds.
  async actOnWithdrawal(req, res) {
    const { action } = req.body;
    const map = { approve: 'APPROVED', pay: 'PAID', reject: 'REJECTED' };
    const next = map[action];
    if (!next) throw BadRequest('INVALID_ACTION', 'action must be approve, pay or reject.');

    const wd = await WithdrawalModel.findById(req.params.id);
    if (!wd) throw NotFound('Withdrawal request not found.');
    if (['PAID', 'REJECTED'].includes(wd.status)) throw BadRequest('ALREADY_SETTLED', 'This request is already settled.');

    if (next === 'REJECTED') {
      await WalletModel.creditExpertAvailable(wd.expert_id, Number(wd.amount));
    }
    await WithdrawalModel.setStatus(req.params.id, next);
    res.json({ status: 'updated', withdrawal_status: next });
  },

  async toggleCoupon(req, res) {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') throw BadRequest('INVALID_BODY', 'is_active must be a boolean.');
    const existing = await CouponModel.findById(req.params.id);
    if (!existing) throw NotFound('Coupon not found.');
    await CouponModel.setActive(req.params.id, is_active);
    res.json({ status: 'updated', is_active });
  },
};
