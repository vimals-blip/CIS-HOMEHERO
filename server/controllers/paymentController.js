import { PaymentModel } from '../models/PaymentModel.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

export const paymentController = {
  async create(req, res) {
    const { booking_id, amount, status } = req.body;
    if (!booking_id || amount == null || !status) {
      throw BadRequest('MISSING_FIELDS', 'booking_id, amount and status are required.');
    }

    const booking = await PaymentModel.findByBooking(booking_id);
    if (!booking) throw NotFound('Booking not found.');
    if (req.user.role !== 'ADMIN' && booking.customer_id !== req.user.id) throw Forbidden();

    const payment = await PaymentModel.create({ bookingId: booking_id, amount, status });
    res.status(201).json(payment);
  },
};
