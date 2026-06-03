import { ReviewModel } from '../models/ReviewModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { BadRequest, Forbidden, NotFound, Conflict } from '../errors.js';

export const reviewController = {
  async list(req, res) {
    const { provider_id } = req.query;
    if (!provider_id) throw BadRequest('MISSING_PARAMS', 'provider_id is required.');
    const reviews = await ReviewModel.findByProvider(provider_id);
    res.json(reviews);
  },

  async create(req, res) {
    const { booking_id, provider_id, rating, comment } = req.body;
    if (!booking_id || !provider_id || !rating) {
      throw BadRequest('MISSING_FIELDS', 'booking_id, provider_id and rating are required.');
    }
    if (rating < 1 || rating > 5) throw BadRequest('INVALID_RATING', 'rating must be between 1 and 5.');

    const booking = await BookingModel.findById(booking_id);
    if (!booking || booking.provider_id !== provider_id) throw NotFound('Booking not found.');
    if (booking.customer_id !== req.user.id) throw Forbidden();
    if (booking.status !== 'COMPLETED') throw BadRequest('BOOKING_NOT_COMPLETED', 'You can only review completed bookings.');

    const existing = await ReviewModel.findByBooking(booking_id);
    if (existing) throw Conflict('ALREADY_REVIEWED', 'You already reviewed this booking.');

    const id = await ReviewModel.create({ bookingId: booking_id, providerId: provider_id, customerId: req.user.id, rating, comment });
    await ReviewModel.recalcProviderStats(provider_id);

    res.status(201).json({ id, rating, comment });
  },
};
