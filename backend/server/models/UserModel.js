import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

export const UserModel = {
  async findAll({ limit, offset, q, role }) {
    const filters = [];
    if (q) filters.push(Prisma.sql`(p.name LIKE ${`%${q}%`} OR u.email LIKE ${`%${q}%`})`);
    if (role) filters.push(Prisma.sql`ur.role = ${role}`);
    const where = filters.length
      ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
      : Prisma.empty;
    const lim = Prisma.raw(String(parseInt(limit) || 20));
    const off = Prisma.raw(String(parseInt(offset) || 0));
    return prisma.$queryRaw`
      SELECT u.id, u.email, u.is_verified, u.is_blocked, u.created_at, ur.role, p.name, p.city, p.phone, p.avatar_url
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN profiles p ON p.id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${lim} OFFSET ${off}
    `;
  },

  async findById(userId) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, is_verified: true, is_blocked: true, created_at: true },
    });
  },

  async bookingsForUser(userId) {
    const rows = await prisma.$queryRaw`
      SELECT b.id, b.status, b.booking_type, b.total_amount, b.expert_amount, b.created_at,
        s.name AS service_name,
        cust.name AS customer_name, exp.name AS expert_name,
        CASE WHEN b.customer_id = ${userId} THEN 'customer' ELSE 'expert' END AS as_role
      FROM bookings b
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN profiles cust ON cust.id = b.customer_id
      LEFT JOIN profiles exp ON exp.id = b.expert_id
      WHERE b.customer_id = ${userId} OR b.expert_id = ${userId}
      ORDER BY b.created_at DESC LIMIT 25
    `;
    return (rows ?? []).map((r) => ({
      ...r,
      total_amount: Number(r.total_amount),
      expert_amount: Number(r.expert_amount),
    }));
  },

  async statsForUser(userId) {
    const [bookings_made, jobs_done, total_spent_agg, reviews_written] = await Promise.all([
      prisma.bookings.count({ where: { customer_id: userId } }),
      prisma.bookings.count({ where: { expert_id: userId } }),
      prisma.bookings.aggregate({ _sum: { total_amount: true }, where: { customer_id: userId, status: 'COMPLETED' } }),
      prisma.reviews.count({ where: { customer_id: userId } }),
    ]);
    return {
      bookings_made: Number(bookings_made),
      jobs_done: Number(jobs_done),
      total_spent: Number(total_spent_agg._sum.total_amount ?? 0),
      reviews_written: Number(reviews_written),
    };
  },

  async updateProfile(userId, { name, phone, city }) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (city !== undefined) data.city = city;
    if (!Object.keys(data).length) return;
    await prisma.profiles.update({ where: { id: userId }, data });
  },

  async setBlocked(userId, blocked) {
    await prisma.users.update({ where: { id: userId }, data: { is_blocked: blocked } });
    if (blocked) {
      await prisma.experts.updateMany({ where: { id: userId }, data: { status: 'OFFLINE' } });
    }
  },

  async setPassword(userId, passwordHash) {
    await prisma.users.update({ where: { id: userId }, data: { password_hash: passwordHash } });
  },

  async remove(userId) {
    await prisma.profiles.delete({ where: { id: userId } });
    await prisma.users.delete({ where: { id: userId } });
  },

  async getProfile(userId) {
    return prisma.profiles.findUnique({
      where: { id: userId },
      select: { name: true, city: true, avatar_url: true, phone: true },
    });
  },

  async getRoles(userId) {
    const rows = await prisma.user_roles.findMany({ where: { user_id: userId }, select: { role: true } });
    return rows.map((r) => r.role);
  },

  async getExpertInfo(userId) {
    return prisma.experts.findUnique({
      where: { id: userId },
      select: { gender: true, bio: true, experience_years: true, is_verified: true, status: true, avg_rating: true, total_jobs: true },
    });
  },

  async findByEmail(email) {
    return prisma.users.findUnique({ where: { email }, select: { id: true, email: true } });
  },

  async listAdmins() {
    return prisma.$queryRaw`
      SELECT u.id, u.email, p.name, ur.role, u.created_at
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      LEFT JOIN profiles p ON p.id = u.id
      WHERE ur.role IN ('ADMIN','SUPER_ADMIN')
      ORDER BY ur.role DESC, u.created_at ASC
    `;
  },

  async setRole(userId, role) {
    await prisma.user_roles.upsert({
      where: { id: userId },
      create: { id: userId, user_id: userId, role },
      update: { role },
    });
  },
};
