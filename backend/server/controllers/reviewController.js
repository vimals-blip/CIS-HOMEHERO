import { ReviewModel } from '../models/ReviewModel.js';
import { ExpertModel } from '../models/ExpertModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { BadRequest, Forbidden, NotFound, Conflict } from '../errors.js';

export const reviewController = {
  async list(req, res) {
    const { expert_id } = req.query;
    if (!expert_id) throw BadRequest('MISSING_PARAMS', 'expert_id is required.');
    const reviews = await ReviewModel.findByExpert(expert_id);
    res.json(reviews);
  },

  async create(req, res) {
    const { booking_id, rating, comment } = req.body;
    if (!booking_id || !rating) throw BadRequest('MISSING_FIELDS', 'booking_id and rating are required.');
    if (rating < 1 || rating > 5) throw BadRequest('INVALID_RATING', 'rating must be between 1 and 5.');

    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw NotFound('Booking not found.');
    if (booking.customer_id !== req.user.id) throw Forbidden();
    if (booking.status !== 'COMPLETED') throw BadRequest('BOOKING_NOT_COMPLETED', 'You can only review completed bookings.');
    if (!booking.expert_id) throw BadRequest('NO_EXPERT', 'This booking has no assigned expert.');

    const existing = await ReviewModel.findByBooking(booking_id);
    if (existing) throw Conflict('ALREADY_REVIEWED', 'You already reviewed this booking.');

    const id = await ReviewModel.create({
      bookingId: booking_id, expertId: booking.expert_id, customerId: req.user.id, rating, comment,
    });
    await ExpertModel.recalcStats(booking.expert_id);

    res.status(201).json({ id, rating, comment });
  },
};
