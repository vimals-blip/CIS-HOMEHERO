import { AdminModel } from '../models/AdminModel.js';
import { ExpertModel } from '../models/ExpertModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { UserModel } from '../models/UserModel.js';
import { CouponModel } from '../models/CouponModel.js';
import { WithdrawalModel } from '../models/WithdrawalModel.js';
import { WalletModel } from '../models/WalletModel.js';
import { AuditModel } from '../models/AuditModel.js';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { audit } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { emitToBooking } from '../realtime/io.js';
import { BadRequest, Conflict, NotFound } from '../errors.js';
import { invalidateGatewayCache } from '../providers/paymentProvider.js';
import { buildAiReportPdf } from '../services/reportPdfService.js';

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
      is_blocked: req.query.is_blocked === 'true' ? true : undefined,
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
      audit(req, is_blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED', { entityType: 'user', entityId: req.params.userId, detail: user.email });
    } else {
      audit(req, 'USER_UPDATED', { entityType: 'user', entityId: req.params.userId, detail: user.email });
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
    audit(req, 'USER_DELETED', { entityType: 'user', entityId: req.params.userId, detail: user.email });
    res.json({ status: 'deleted' });
  },

  // Admin resets a user's password. Accepts an explicit new_password or
  // generates a temporary one that is returned ONCE for the admin to relay.
  async resetPassword(req, res) {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw NotFound('User not found.');
    const roles = await UserModel.getRoles(req.params.userId);
    // Only a super-admin may reset another admin/super-admin's password.
    if ((roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) && req.user.role !== 'SUPER_ADMIN') {
      throw BadRequest('FORBIDDEN', 'Only a super admin can reset an admin password.');
    }
    let pwd = req.body.new_password;
    let generated = false;
    if (!pwd) { pwd = 'Hh' + Math.random().toString(36).slice(2, 8) + '!'; generated = true; }
    if (pwd.length < 6) throw BadRequest('WEAK_PASSWORD', 'Password must be at least 6 characters.');
    await UserModel.setPassword(req.params.userId, await bcrypt.hash(pwd, 10));
    audit(req, 'PASSWORD_RESET', { entityType: 'user', entityId: req.params.userId, detail: user.email });
    res.json({ status: 'reset', temp_password: generated ? pwd : undefined });
  },

  async getAuditLogs(req, res) {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    res.json(await AuditModel.list({ limit, action: req.query.action }));
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
    audit(req, 'ROLE_CHANGED', { entityType: 'user', entityId: target, detail: `→ ${role}` });
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
    audit(req, `WITHDRAWAL_${next}`, { entityType: 'withdrawal', entityId: req.params.id, detail: `₹${wd.amount} · expert ${wd.expert_id}` });
    const wdMsg = {
      APPROVED: `Your withdrawal of ₹${wd.amount} was approved and is being processed.`,
      PAID: `₹${wd.amount} has been paid out to your account.`,
      REJECTED: `Your withdrawal of ₹${wd.amount} was rejected and the amount returned to your balance.`,
    };
    await notify(wd.expert_id, { type: `withdrawal_${next.toLowerCase()}`, title: `Withdrawal ${next.toLowerCase()}`, body: wdMsg[next] });
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

  async getExpertDetail(req, res) {
    const { id } = req.params;
    const expert = await ExpertModel.findById(id);
    if (!expert) throw NotFound('Expert not found.');
    const [services, profile, bookings, transactions, documents] = await Promise.all([
      ExpertModel.getServices(id),
      UserModel.getProfile(id),
      BookingModel.findForExpert(id),
      WalletModel.transactionsForUser(id, 20),
      prisma.expert_documents.findMany({ where: { expert_id: id } }),
    ]);
    res.json({
      id: expert.id,
      name: profile?.name ?? expert.name ?? null,
      city: profile?.city ?? expert.city ?? null,
      email: null,
      gender: expert.gender,
      bio: expert.bio,
      experience_years: expert.experience_years,
      avg_rating: Number(expert.avg_rating || 0),
      total_jobs: expert.total_jobs ?? 0,
      is_verified: Boolean(expert.is_verified),
      is_trained: Boolean(expert.is_trained),
      status: expert.status,
      onboarding_status: expert.onboarding_status,
      avatar_url: profile?.avatar_url ?? expert.avatar_url ?? null,
      is_blocked: Boolean(expert.is_blocked),
      created_at: expert.created_at,
      service_ids: services.map(s => s.service_id),
      services: services,
      bookings: (bookings ?? []).slice(0, 10),
      transactions: transactions ?? [],
      documents: documents ?? [],
    });
  },

  async updateExpert(req, res) {
    const { id } = req.params;
    const expert = await ExpertModel.findById(id);
    if (!expert) throw NotFound('Expert not found.');
    const { bio, gender, experience_years, is_trained, is_verified, is_blocked, service_ids, name, avatar_url, city } = req.body;

    const profileData = {};
    if (name !== undefined) profileData.name = name;
    if (city !== undefined) profileData.city = city;
    if (avatar_url !== undefined) profileData.avatar_url = avatar_url;
    if (Object.keys(profileData).length) await UserModel.updateProfile(id, profileData);

    const expertData = {};
    if (bio !== undefined) expertData.bio = bio;
    if (gender !== undefined) expertData.gender = gender;
    if (experience_years !== undefined) expertData.experience_years = Number(experience_years);
    if (is_trained !== undefined) expertData.is_trained = Boolean(is_trained);
    if (Object.keys(expertData).length) await prisma.experts.update({ where: { id }, data: expertData });

    if (is_verified !== undefined) {
      await ExpertModel.setVerified(id, Boolean(is_verified));
      audit(req, Boolean(is_verified) ? 'EXPERT_VERIFIED' : 'EXPERT_REJECTED', { entityType: 'expert', entityId: id });
    }
    if (is_blocked !== undefined) {
      await UserModel.setBlocked(id, Boolean(is_blocked));
      audit(req, Boolean(is_blocked) ? 'USER_BLOCKED' : 'USER_UNBLOCKED', { entityType: 'expert', entityId: id });
    }
    if (Array.isArray(service_ids)) {
      await prisma.expert_services.deleteMany({ where: { expert_id: id } });
      if (service_ids.length) {
        await prisma.expert_services.createMany({
          data: service_ids.map((sid) => ({ expert_id: id, service_id: sid })),
          skipDuplicates: true,
        });
      }
    }
    audit(req, 'EXPERT_UPDATED', { entityType: 'expert', entityId: id });
    res.json({ status: 'updated' });
  },

  async setExpertServiceTrainingStatus(req, res) {
    const { id, serviceId } = req.params;
    const { is_trained } = req.body;
    
    if (typeof is_trained !== 'boolean') {
      throw BadRequest('INVALID_BODY', 'is_trained must be a boolean.');
    }

    const expert = await ExpertModel.findById(id);
    if (!expert) throw NotFound('Expert not found.');

    const existing = await prisma.expert_services.findUnique({
      where: { expert_id_service_id: { expert_id: id, service_id: serviceId } }
    });
    if (!existing) throw NotFound('Service not found for this expert.');

    await prisma.expert_services.update({
      where: { expert_id_service_id: { expert_id: id, service_id: serviceId } },
      data: { is_trained }
    });

    audit(req, 'EXPERT_SERVICE_TRAINED_TOGGLED', { entityType: 'expert', entityId: id, detail: `${serviceId} -> ${is_trained}` });
    res.json({ status: 'updated', is_trained });
  },

  async deleteExpert(req, res) {
    const { id } = req.params;
    const expert = await ExpertModel.findById(id);
    if (!expert) throw NotFound('Expert not found.');
    await UserModel.remove(id);
    audit(req, 'USER_DELETED', { entityType: 'expert', entityId: id, detail: `expert ${id}` });
    res.json({ status: 'deleted' });
  },

  async getBookingDetail(req, res) {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    res.json({
      ...booking,
      total_amount: Number(booking.total_amount),
      platform_fee: Number(booking.platform_fee),
      expert_amount: Number(booking.expert_amount),
      base_amount: Number(booking.base_amount),
      discount_amount: Number(booking.discount_amount ?? 0),
      duration_hours: Number(booking.duration_hours),
    });
  },

  async getAvailableExperts(req, res) {
    const { serviceId } = req.query;
    const rows = await prisma.$queryRaw`
      SELECT e.id, p.name, p.avatar_url, e.status, e.avg_rating, e.is_verified,
        (SELECT COUNT(*) FROM bookings b WHERE b.expert_id = e.id AND b.status IN ('ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS')) AS active_jobs
      FROM experts e
      JOIN profiles p ON p.id = e.id
      LEFT JOIN expert_services es ON es.expert_id = e.id AND es.service_id = ${serviceId ?? ''}
      WHERE e.status IN ('ONLINE','BUSY')
        AND e.is_verified = 1
        AND (${serviceId ?? ''} = '' OR es.service_id IS NOT NULL)
      ORDER BY e.avg_rating DESC, active_jobs ASC
      LIMIT 30
    `;
    res.json(rows.map(r => ({
      id: r.id, name: r.name, avatar_url: r.avatar_url,
      status: r.status, avg_rating: Number(r.avg_rating ?? 0),
      active_jobs: Number(r.active_jobs ?? 0),
    })));
  },

  async assignBooking(req, res) {
    const { id } = req.params;
    const { expert_id } = req.body;
    if (!expert_id) throw BadRequest('MISSING_FIELD', 'expert_id is required.');

    const booking = await BookingModel.findById(id);
    if (!booking) throw NotFound('Booking not found.');
    if (booking.status !== 'SEARCHING') throw BadRequest('NOT_SEARCHING', `Booking is ${booking.status}, not SEARCHING.`);

    const expert = await ExpertModel.findById(expert_id);
    if (!expert) throw NotFound('Expert not found.');

    const eta = 6 + Math.floor(Math.random() * 9);
    await BookingModel.assignExpert(id, expert_id, eta);
    await BookingModel.addEvent(id, 'ASSIGNED', 'Expert manually assigned by admin.');
    emitToBooking(id, 'booking_assigned', { status: 'ASSIGNED', eta_minutes: eta, expert_id });
    await notify(booking.customer_id, { type: 'booking_assigned', title: 'Expert assigned', body: `Your expert is arriving in ~${eta} min.`, bookingId: id });
    await notify(expert_id, { type: 'job_assigned', title: 'New job assigned', body: 'You have a new booking (admin assigned).', bookingId: id });

    res.json({ ok: true, expert_id, eta_minutes: eta });
  },

  async getReport(req, res) {
    const { type = 'revenue' } = req.query;
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    to.setHours(23, 59, 59, 999);

    const { Prisma } = await import('@prisma/client');
    let data;

    if (type === 'revenue') {
      data = await prisma.$queryRaw(Prisma.sql`
        SELECT DATE(created_at) AS date,
          COUNT(*) AS bookings,
          SUM(total_amount) AS revenue,
          SUM(platform_fee) AS platform_fee,
          SUM(expert_amount) AS expert_payout
        FROM bookings
        WHERE status = 'COMPLETED' AND created_at BETWEEN ${from} AND ${to}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      data = data.map(r => ({
        date: r.date, bookings: Number(r.bookings),
        revenue: Number(r.revenue), platform_fee: Number(r.platform_fee), expert_payout: Number(r.expert_payout),
      }));
    } else if (type === 'bookings') {
      const byStatus = await prisma.$queryRaw(Prisma.sql`
        SELECT status, COUNT(*) AS count FROM bookings
        WHERE created_at BETWEEN ${from} AND ${to}
        GROUP BY status ORDER BY count DESC
      `);
      const byService = await prisma.$queryRaw(Prisma.sql`
        SELECT s.name AS service_name, COUNT(b.id) AS bookings, SUM(b.total_amount) AS revenue
        FROM bookings b JOIN services s ON s.id = b.service_id
        WHERE b.created_at BETWEEN ${from} AND ${to}
        GROUP BY s.id, s.name ORDER BY bookings DESC
      `);
      data = {
        by_status: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
        by_service: byService.map(r => ({ service_name: r.service_name, bookings: Number(r.bookings), revenue: Number(r.revenue) })),
      };
    } else if (type === 'experts') {
      data = await prisma.$queryRaw(Prisma.sql`
        SELECT p.name, e.avg_rating, e.total_jobs,
          COUNT(b.id) AS period_jobs,
          COALESCE(SUM(b.expert_amount), 0) AS period_earnings
        FROM experts e
        JOIN profiles p ON p.id = e.id
        LEFT JOIN bookings b ON b.expert_id = e.id AND b.status = 'COMPLETED' AND b.created_at BETWEEN ${from} AND ${to}
        GROUP BY e.id, p.name, e.avg_rating, e.total_jobs
        ORDER BY period_jobs DESC
        LIMIT 20
      `);
      data = data.map(r => ({
        name: r.name, avg_rating: Number(r.avg_rating), total_jobs: Number(r.total_jobs),
        period_jobs: Number(r.period_jobs), period_earnings: Number(r.period_earnings),
      }));
    } else if (type === 'services') {
      data = await prisma.$queryRaw(Prisma.sql`
        SELECT s.name AS service_name, s.rate_per_hour, s.platform_fee_pct,
          COUNT(b.id) AS bookings,
          COALESCE(SUM(b.total_amount), 0) AS revenue,
          COALESCE(SUM(b.platform_fee), 0) AS platform_earnings
        FROM services s
        LEFT JOIN bookings b ON b.service_id = s.id AND b.created_at BETWEEN ${from} AND ${to}
        GROUP BY s.id, s.name, s.rate_per_hour, s.platform_fee_pct
        ORDER BY bookings DESC
      `);
      data = data.map(r => ({
        service_name: r.service_name, rate_per_hour: Number(r.rate_per_hour),
        platform_fee_pct: Number(r.platform_fee_pct), bookings: Number(r.bookings),
        revenue: Number(r.revenue), platform_earnings: Number(r.platform_earnings),
      }));
    } else {
      throw BadRequest('INVALID_TYPE', 'type must be revenue, bookings, experts, or services');
    }

    res.json({ type, from: from.toISOString(), to: to.toISOString(), generated_at: new Date().toISOString(), data });
  },

  async getPaymentConfig(_req, res) {
    const KEYS = [
      'payment_gateway', 'payment_mode',
      'razorpay_test_key_id',    'razorpay_test_key_secret',
      'razorpay_live_key_id',    'razorpay_live_key_secret',
      'stripe_test_secret_key',  'stripe_test_publishable_key',
      'stripe_live_secret_key',  'stripe_live_publishable_key',
    ];
    const rows = await prisma.settings.findMany({ where: { setting_key: { in: KEYS } } });
    const cfg  = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value ?? '']));
    res.json(cfg);
  },

  async savePaymentConfig(req, res) {
    const ALLOWED = [
      'payment_gateway', 'payment_mode',
      'razorpay_test_key_id',    'razorpay_test_key_secret',
      'razorpay_live_key_id',    'razorpay_live_key_secret',
      'stripe_test_secret_key',  'stripe_test_publishable_key',
      'stripe_live_secret_key',  'stripe_live_publishable_key',
    ];
    const updates = req.body ?? {};
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED.includes(key)) continue;
      await prisma.settings.upsert({
        where:  { setting_key: key },
        create: { setting_key: key, setting_value: String(value ?? ''), is_public: false },
        update: { setting_value: String(value ?? '') },
      });
    }
    invalidateGatewayCache();
    res.json({ status: 'saved' });
  },

  async downloadAiReportPdf(req, res) {
    // 1. Gather raw data from DB
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      totalUsers, totalExperts, totalBookings, revenueSum,
      bookingsByStatus, expertsByStatus, topServices,
      recentBookings, recentRevenue,
      previousBookings, previousRevenue
    ] = await Promise.all([
      prisma.user_roles.count({ where: { role: 'CUSTOMER' } }),
      prisma.experts.count(),
      prisma.bookings.count(),
      prisma.bookings.aggregate({ _sum: { total_amount: true, platform_fee: true } }),
      prisma.bookings.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.experts.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.bookings.groupBy({ by: ['service_id'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5 }),
      prisma.bookings.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      prisma.bookings.aggregate({ where: { created_at: { gte: thirtyDaysAgo } }, _sum: { total_amount: true, platform_fee: true } }),
      prisma.bookings.count({ where: { created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.bookings.aggregate({ where: { created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _sum: { total_amount: true, platform_fee: true } }),
    ]);

    const data = {
      total_users: totalUsers,
      total_experts: totalExperts,
      total_bookings: totalBookings,
      total_revenue: revenueSum._sum.total_amount || 0,
      total_platform_fee: revenueSum._sum.platform_fee || 0,
      bookings_by_status: bookingsByStatus,
      experts_by_status: expertsByStatus,
      top_services: topServices,
      last_30_days: {
        bookings: recentBookings,
        revenue: recentRevenue._sum.total_amount || 0,
        platform_fee: recentRevenue._sum.platform_fee || 0,
      },
      previous_30_days: {
        bookings: previousBookings,
        revenue: previousRevenue._sum.total_amount || 0,
        platform_fee: previousRevenue._sum.platform_fee || 0,
      }
    };

    // 2. Fetch AI Insights
    const AI_BASE = 'http://127.0.0.1:8000/api/v1'; // Assuming ai-services runs locally
    let aiInsights;
    try {
      const grokSetting = await prisma.settings.findUnique({ where: { setting_key: 'global_grok_api_key' } });
      const groqSetting = await prisma.settings.findUnique({ where: { setting_key: 'global_groq_api_key' } });
      
      const grokKey = grokSetting?.setting_value || '';
      const groqKey = groqSetting?.setting_value || '';
      
      const provider = groqKey ? 'groq' : 'grok';
      const apiKey = groqKey || grokKey;

      const aiRes = await fetch(`${AI_BASE}/reports/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: data, api_key: apiKey, provider })
      });
      if (!aiRes.ok) throw new Error('AI Service error');
      aiInsights = await aiRes.json();
    } catch (e) {
      console.error("AI Report generation failed:", e);
      aiInsights = {
        executive_summary: "AI service unavailable. Could not generate comprehensive insights.",
        revenue_analysis: "Unavailable.",
        operational_efficiency: "Unavailable.",
        expert_performance: "Unavailable.",
        strategic_recommendations: ["Ensure ai-services is running on port 8000 and GEMINI_API_KEY is configured."]
      };
    }

    // 3. Generate PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Business_Intelligence_Report.pdf"`);
    
    buildAiReportPdf(
      data,
      aiInsights,
      (chunk) => res.write(chunk),
      () => res.end()
    );
  },
};
