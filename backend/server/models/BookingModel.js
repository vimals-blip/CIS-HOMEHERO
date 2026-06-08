import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

const BOOKING_SELECT = Prisma.sql`
  SELECT b.*,
    s.name AS service_name, s.slug AS service_slug, s.icon_name AS service_icon, s.image_url AS service_image,
    ep.name AS expert_name, ep.avatar_url AS expert_avatar, e.avg_rating AS expert_rating,
    e.current_lat AS expert_lat, e.current_lng AS expert_lng,
    cust.name AS customer_name, cust.phone AS customer_phone, cust.avatar_url AS customer_avatar
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN experts e ON e.id = b.expert_id
  LEFT JOIN profiles ep ON ep.id = b.expert_id
  LEFT JOIN profiles cust ON cust.id = b.customer_id
`;

export const BookingModel = {
  async create(data, tx = prisma) {
    const id = data.id ?? `bk-${crypto.randomUUID()}`;
    await tx.bookings.create({
      data: {
        id,
        customer_id: data.customerId,
        expert_id: data.expertId ?? null,
        service_id: data.serviceId,
        booking_type: data.bookingType,
        scheduled_at: data.scheduledAt ?? null,
        duration_hours: data.durationHours,
        status: data.status,
        eta_minutes: data.etaMinutes ?? null,
        address_snapshot: data.addressSnapshot,
        pincode: data.pincode ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        base_amount: data.baseAmount,
        platform_fee: data.platformFee,
        expert_amount: data.expertAmount,
        total_amount: data.totalAmount,
        discount_amount: data.discountAmount ?? 0,
        payment_method: data.paymentMethod ?? 'CASH',
        payment_status: data.paymentStatus ?? 'PENDING',
        coupon_code: data.couponCode ?? null,
        notes: data.notes ?? null,
      },
    });
    return id;
  },

  async findById(id) {
    const rows = await prisma.$queryRaw`${BOOKING_SELECT} WHERE b.id = ${id}`;
    return rows[0] ?? null;
  },

  async findForCustomer(customerId) {
    return prisma.$queryRaw`${BOOKING_SELECT} WHERE b.customer_id = ${customerId} ORDER BY b.created_at DESC`;
  },

  async findForExpert(expertId) {
    return prisma.$queryRaw`${BOOKING_SELECT} WHERE b.expert_id = ${expertId} ORDER BY b.created_at DESC`;
  },

  async findAll({ status, limit, offset }) {
    const lim = Prisma.raw(String(parseInt(limit) || 20));
    const off = Prisma.raw(String(parseInt(offset) || 0));
    if (status) {
      return prisma.$queryRaw`${BOOKING_SELECT} WHERE b.status = ${status} ORDER BY b.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    }
    return prisma.$queryRaw`${BOOKING_SELECT} ORDER BY b.created_at DESC LIMIT ${lim} OFFSET ${off}`;
  },

  async unassign(id) {
    await prisma.bookings.update({
      where: { id },
      data: { expert_id: null, status: 'SEARCHING', eta_minutes: null },
    });
  },

  async assignExpert(id, expertId, etaMinutes) {
    await prisma.bookings.update({
      where: { id },
      data: { expert_id: expertId, status: 'ASSIGNED', eta_minutes: etaMinutes ?? null },
    });
  },

  async updateStatus(id, status, extra = {}) {
    const data = { status };
    if (extra.startedAt) data.started_at = new Date();
    if (extra.completedAt) data.completed_at = new Date();
    if (extra.cancelReason !== undefined) data.cancel_reason = extra.cancelReason;
    if (extra.etaMinutes !== undefined) data.eta_minutes = extra.etaMinutes;
    if (extra.paymentStatus !== undefined) data.payment_status = extra.paymentStatus;
    await prisma.bookings.update({ where: { id }, data });
  },

  async addEvent(bookingId, status, message) {
    await prisma.booking_events.create({
      data: {
        id: `evt-${crypto.randomUUID()}`,
        booking_id: bookingId,
        status,
        message: message ?? null,
      },
    });
  },

  async listEvents(bookingId) {
    return prisma.booking_events.findMany({
      where: { booking_id: bookingId },
      select: { id: true, status: true, message: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
  },
};
