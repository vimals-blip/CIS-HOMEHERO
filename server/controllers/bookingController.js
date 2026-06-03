import { BookingModel } from '../models/BookingModel.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function formatBooking(row) {
  return {
    ...row,
    total_amount: Number(row.total_amount),
    platform_fee: Number(row.platform_fee),
    provider_amount: Number(row.provider_amount),
  };
}

export const bookingController = {
  async list(req, res) {
    const { customer_id, provider_id } = req.query;

    if (req.user.role !== 'ADMIN') {
      if (customer_id && customer_id !== req.user.id) throw Forbidden();
      if (provider_id && provider_id !== req.user.id) throw Forbidden();
    }

    const rows = await BookingModel.findFiltered({ customerId: customer_id, providerId: provider_id });
    res.json(rows.map(formatBooking));
  },

  async create(req, res) {
    const {
      id, address, category_id, customer_id, provider_id,
      scheduled_date, scheduled_time, total_amount,
      platform_fee = 0, provider_amount = 0,
      notes = null, coupon_code = null,
    } = req.body;

    if (!address || !category_id || !customer_id || !provider_id || !scheduled_date || !scheduled_time || total_amount == null) {
      throw BadRequest('MISSING_FIELDS', 'address, category_id, customer_id, provider_id, scheduled_date, scheduled_time and total_amount are required.');
    }
    if (req.user.role !== 'ADMIN' && customer_id !== req.user.id) {
      throw Forbidden('You can only create bookings for yourself.');
    }
    if (address.length > 1000) throw BadRequest('ADDRESS_TOO_LONG', 'Address must not exceed 1000 characters.');
    if (notes && notes.length > 1000) throw BadRequest('NOTES_TOO_LONG', 'Notes must not exceed 1000 characters.');

    const bookingId = id ?? `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await BookingModel.create({
      id: bookingId, address, categoryId: category_id, couponCode: coupon_code,
      customerId: customer_id, providerId: provider_id,
      scheduledDate: scheduled_date, scheduledTime: scheduled_time,
      totalAmount: total_amount, platformFee: platform_fee, providerAmount: provider_amount, notes,
    });
    res.status(201).json({ id: bookingId });
  },

  async updateStatus(req, res) {
    const { status } = req.body;
    if (!status) throw BadRequest('MISSING_FIELDS', 'status is required.');
    if (!VALID_STATUSES.includes(status)) throw BadRequest('INVALID_STATUS', 'Invalid booking status.');

    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    if (req.user.role !== 'ADMIN' && booking.provider_id !== req.user.id && booking.customer_id !== req.user.id) {
      throw Forbidden();
    }

    await BookingModel.updateStatus(req.params.id, status);
    res.json({ status: 'updated', booking_status: status });
  },
};
