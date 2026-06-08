import crypto from 'node:crypto';
import prisma from '../prisma.js';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

export const CouponModel = {
  async findAll() {
    return prisma.coupons.findMany({ orderBy: { created_at: 'desc' } });
  },

  async findByCode(code) {
    return prisma.coupons.findUnique({ where: { code } });
  },

  async findById(id) {
    return prisma.coupons.findUnique({ where: { id } });
  },

  async create({ code, type, value, maxUses, expiresAt }) {
    const id = `coupon-${crypto.randomUUID()}`;
    await prisma.coupons.create({
      data: { id, code, type, value, used_count: 0, max_uses: maxUses ?? null, is_active: true, expires_at: expiresAt ?? null },
    });
    return { id, code, type, value, is_active: true };
  },

  async setActive(id, isActive) {
    await prisma.coupons.update({ where: { id }, data: { is_active: isActive } });
  },

  async usageCountForUser(couponId, userId) {
    return prisma.coupon_usage.count({ where: { coupon_id: couponId, user_id: userId } });
  },

  async evaluate(code, subtotal, userId) {
    const coupon = await this.findByCode(String(code).toUpperCase());
    if (!coupon) return { ok: false, reason: 'Coupon not found.' };
    if (!coupon.is_active) return { ok: false, reason: 'This coupon is no longer active.' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { ok: false, reason: 'This coupon has expired.' };
    }
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
      return { ok: false, reason: 'This coupon has reached its usage limit.' };
    }
    if (userId && (await this.usageCountForUser(coupon.id, userId)) > 0) {
      return { ok: false, reason: 'You have already used this coupon.' };
    }

    const raw = coupon.type === 'PERCENT'
      ? (Number(subtotal) * Number(coupon.value)) / 100
      : Number(coupon.value);
    const discount = round2(Math.min(raw, Number(subtotal)));
    return { ok: true, coupon, discount };
  },

  async recordUsage(couponId, userId, bookingId, discount) {
    const id = `cpu-${crypto.randomUUID()}`;
    await prisma.coupon_usage.create({
      data: { id, coupon_id: couponId, user_id: userId, booking_id: bookingId ?? null, discount },
    });
    await prisma.coupons.update({ where: { id: couponId }, data: { used_count: { increment: 1 } } });
  },
};
