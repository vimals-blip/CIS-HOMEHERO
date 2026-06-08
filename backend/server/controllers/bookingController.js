import prisma from '../prisma.js';
import { BookingModel } from '../models/BookingModel.js';
import { ServiceModel } from '../models/ServiceModel.js';
import { ExpertModel } from '../models/ExpertModel.js';
import { AddressModel } from '../models/AddressModel.js';
import { WalletModel } from '../models/WalletModel.js';
import { CouponModel } from '../models/CouponModel.js';
import { PaymentModel } from '../models/PaymentModel.js';
import { PaymentTxnModel } from '../models/PaymentTxnModel.js';
import { paymentProvider } from '../providers/paymentProvider.js';
import { dispatchService } from '../services/dispatchService.js';
import { emitToBooking } from '../realtime/io.js';
import { notify } from '../services/notificationService.js';
import { isAdmin } from '../middleware/auth.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

const VALID_PAYMENT_METHODS = ['CASH', 'WALLET', 'ONLINE'];

const PLATFORM_FEE_PCT = 0.15;
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const randomEta = () => 6 + Math.floor(Math.random() * 9); // 6–14 minutes

// Allowed forward transitions an expert drives a job through.
// The expert must first ACCEPT an assigned booking before starting the trip.
const EXPERT_FLOW = {
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'ON_THE_WAY',
  ON_THE_WAY: 'ARRIVED',
  ARRIVED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

const STATUS_MESSAGE = {
  SEARCHING: 'Finding the best expert near you…',
  ASSIGNED: 'Expert assigned to your booking.',
  ACCEPTED: 'Your expert accepted the booking.',
  ON_THE_WAY: 'Your expert is on the way.',
  ARRIVED: 'Your expert has arrived.',
  IN_PROGRESS: 'Service in progress.',
  COMPLETED: 'Service completed.',
  CANCELLED: 'Booking cancelled.',
};

function format(row) {
  return {
    ...row,
    duration_hours: Number(row.duration_hours),
    base_amount: Number(row.base_amount),
    platform_fee: Number(row.platform_fee),
    expert_amount: Number(row.expert_amount),
    total_amount: Number(row.total_amount),
    expert_rating: row.expert_rating == null ? null : Number(row.expert_rating),
  };
}

export const bookingController = {
  async list(req, res) {
    let rows;
    if (req.user.role === 'EXPERT') {
      rows = await BookingModel.findForExpert(req.user.id);
    } else {
      rows = await BookingModel.findForCustomer(req.user.id);
    }
    res.json(rows.map(format));
  },

  async getOne(req, res) {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    if (!isAdmin(req.user) && booking.customer_id !== req.user.id && booking.expert_id !== req.user.id) {
      throw Forbidden();
    }
    const events = await BookingModel.listEvents(req.params.id);
    res.json({ ...format(booking), events });
  },

  async create(req, res) {
    const {
      service_id, duration_hours, booking_type = 'INSTANT', scheduled_at = null,
      address_id = null, address_snapshot = null, pincode = null, lat = null, lng = null,
      coupon_code = null, payment_method = 'CASH', notes = null,
      preferred_expert_id = null,
    } = req.body;

    if (!service_id || duration_hours == null) {
      throw BadRequest('MISSING_FIELDS', 'service_id and duration_hours are required.');
    }
    if (!['INSTANT', 'SCHEDULED'].includes(booking_type)) {
      throw BadRequest('INVALID_TYPE', 'booking_type must be INSTANT or SCHEDULED.');
    }
    if (booking_type === 'SCHEDULED' && !scheduled_at) {
      throw BadRequest('MISSING_SCHEDULE', 'scheduled_at is required for scheduled bookings.');
    }
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw BadRequest('INVALID_PAYMENT_METHOD', 'payment_method must be CASH, WALLET, or ONLINE.');
    }

    const service = await ServiceModel.findById(service_id);
    if (!service || !service.is_active) throw NotFound('Service not available.');

    const duration = Number(duration_hours);
    if (duration < Number(service.min_hours)) {
      throw BadRequest('DURATION_TOO_SHORT', `Minimum duration for this service is ${service.min_hours} hour(s).`);
    }

    // Resolve the address — either a saved address or an inline snapshot.
    let snapshot = address_snapshot, pin = pincode, latVal = lat, lngVal = lng;
    if (address_id) {
      const addr = await AddressModel.findById(address_id);
      if (!addr || addr.customer_id !== req.user.id) throw NotFound('Address not found.');
      snapshot = [addr.flat, addr.address_line, addr.landmark, addr.city, addr.pincode].filter(Boolean).join(', ');
      pin = addr.pincode; latVal = addr.lat; lngVal = addr.lng;
    }
    if (!snapshot) throw BadRequest('MISSING_ADDRESS', 'Provide address_id or address_snapshot.');

    // ── Pricing: base → coupon discount → total → fee split ──────────────────
    const base = round2(Number(service.rate_per_hour) * duration);

    let discount = 0;
    let couponRow = null;
    if (coupon_code) {
      const result = await CouponModel.evaluate(coupon_code, base, req.user.id);
      if (!result.ok) throw BadRequest('INVALID_COUPON', result.reason);
      discount = result.discount;
      couponRow = result.coupon;
    }

    const total = round2(Math.max(0, base - discount));
    const platformFee = round2(total * PLATFORM_FEE_PCT);
    const expertAmount = round2(total - platformFee);

    // Wallet payment is settled up front; cash/online is settled after.
    const payWithWallet = payment_method === 'WALLET';
    if (payWithWallet) {
      const wallet = await WalletModel.getCustomer(req.user.id);
      if (wallet.balance < total) {
        throw BadRequest('INSUFFICIENT_BALANCE', `Wallet balance ₹${wallet.balance} is less than the amount due ₹${total}.`);
      }
    }

    // Dispatch: prefer a customer-requested expert if they are available.
    let expert = null;
    let etaMinutes = null;
    if (preferred_expert_id) {
      const preferredRow = await ExpertModel.findById(preferred_expert_id);
      if (preferredRow && preferredRow.status === 'ONLINE' && !Boolean(preferredRow.is_blocked)) {
        const activeBusyCount = await prisma.bookings.count({
          where: {
            expert_id: preferred_expert_id,
            status: { in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] },
          },
        });
        if (activeBusyCount === 0) {
          expert = preferredRow;
          etaMinutes = booking_type === 'INSTANT' ? randomEta() : null;
        }
      }
    }
    if (!expert) {
      const match = await dispatchService.findBestExpert(service_id, { lat: latVal, lng: lngVal });
      expert = match?.expert ?? null;
      etaMinutes = expert && booking_type === 'INSTANT' ? dispatchService.etaMinutes(match.distance) : null;
    }
    const assigned = Boolean(expert);
    const status = assigned ? 'ASSIGNED' : 'SEARCHING';
    const eta = etaMinutes;

    const bookingPayload = {
      customerId: req.user.id,
      expertId: expert?.id ?? null,
      serviceId: service_id,
      bookingType: booking_type,
      scheduledAt: scheduled_at,
      durationHours: duration,
      status,
      etaMinutes: eta,
      addressSnapshot: snapshot,
      pincode: pin,
      lat: latVal,
      lng: lngVal,
      baseAmount: base,
      platformFee,
      expertAmount,
      totalAmount: total,
      discountAmount: discount,
      paymentMethod: payment_method,
      paymentStatus: payWithWallet ? 'PAID' : 'PENDING',
      couponCode: coupon_code,
      notes,
    };

    // Create booking (and debit wallet, if used) atomically.
    let bookingId;
    if (payWithWallet) {
      bookingId = await prisma.$transaction(async (tx) => {
        const id = await BookingModel.create(bookingPayload, tx);
        await WalletModel.debitWithConn(tx, req.user.id, total, id, `Payment for ${service.name}`);
        return id;
      });
      await PaymentModel.create({ bookingId, amount: total, method: 'WALLET', status: 'PAID' });
    } else {
      bookingId = await BookingModel.create(bookingPayload);
    }

    if (couponRow) await CouponModel.recordUsage(couponRow.id, req.user.id, bookingId, discount);

    await BookingModel.addEvent(bookingId, 'SEARCHING', STATUS_MESSAGE.SEARCHING);
    await notify(req.user.id, { type: 'booking_created', title: 'Booking placed', body: `Your ${service.name} booking is confirmed.`, bookingId });

    if (assigned) {
      await BookingModel.addEvent(bookingId, 'ASSIGNED', STATUS_MESSAGE.ASSIGNED);
      // Take an instant-booking expert off the available pool.
      if (booking_type === 'INSTANT' && expert.status === 'ONLINE') {
        await ExpertModel.setStatus(expert.id, 'BUSY');
      }
      await notify(expert.id, { type: 'job_assigned', title: 'New job assigned', body: `${service.name} · ${snapshot}`, bookingId });
    } else {
      // No expert online right now — keep searching in the background.
      dispatchService.scheduleRetry(bookingId);
    }

    // For online payments, create a gateway order so the frontend can open Razorpay checkout.
    let gatewayOrder = null;
    if (payment_method === 'ONLINE' && total > 0) {
      gatewayOrder = await paymentProvider.createOrder({ amount: total, receipt: `booking_${bookingId}` });
      await PaymentTxnModel.create({
        userId: req.user.id,
        bookingId,
        orderId: gatewayOrder.id,
        amount: total,
        purpose: 'BOOKING',
        provider: gatewayOrder.provider ?? 'MOCK',
      });
    }

    res.status(201).json({
      id: bookingId,
      status,
      eta_minutes: eta,
      total_amount: total,
      discount,
      ...(gatewayOrder && {
        gateway_order_id: gatewayOrder.id,
        gateway_amount:   gatewayOrder.amount,   // paise
        gateway_currency: gatewayOrder.currency,
        gateway_key_id:   gatewayOrder.key_id ?? null,
        gateway_mock:     Boolean(gatewayOrder.mock),
      }),
    });
  },

  // Expert (or admin) advances a booking through the tracking flow.
  async updateStatus(req, res) {
    const { status } = req.body;
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    if (!isAdmin(req.user) && booking.expert_id !== req.user.id) throw Forbidden();

    const expected = EXPERT_FLOW[booking.status];
    if (!expected || status !== expected) {
      throw BadRequest('INVALID_TRANSITION', `Cannot move booking from ${booking.status} to ${status}.`);
    }

    const extra = {};
    if (status === 'IN_PROGRESS') extra.startedAt = true;
    if (status === 'ON_THE_WAY') extra.etaMinutes = booking.eta_minutes ?? randomEta();

    if (status === 'COMPLETED') {
      extra.completedAt = true;
      if (booking.expert_id) {
        await WalletModel.credit(booking.expert_id, Number(booking.expert_amount));
        await ExpertModel.incrementJobs(booking.expert_id);
        await ExpertModel.setStatus(booking.expert_id, 'ONLINE');
      }
      // Wallet bookings are already paid; cash is collected at completion.
      if (booking.payment_status !== 'PAID') {
        await PaymentModel.create({ bookingId: booking.id, amount: Number(booking.total_amount), method: booking.payment_method ?? 'CASH', status: 'PAID' });
        extra.paymentStatus = 'PAID';
      }
    }

    await BookingModel.updateStatus(req.params.id, status, extra);
    await BookingModel.addEvent(req.params.id, status, STATUS_MESSAGE[status]);

    // Push the update to anyone tracking this booking, and notify the customer.
    emitToBooking(req.params.id, 'booking_status_updated', { status, message: STATUS_MESSAGE[status] });
    await notify(booking.customer_id, { type: 'booking_status', title: 'Booking update', body: STATUS_MESSAGE[status], bookingId: req.params.id });
    if (status === 'COMPLETED') {
      emitToBooking(req.params.id, 'payment_success', { amount: Number(booking.total_amount) });
    }

    res.json({ status: 'updated', booking_status: status });
  },

  // Expert rejects an assigned booking → free them and re-dispatch to someone else.
  async reject(req, res) {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    if (!isAdmin(req.user) && booking.expert_id !== req.user.id) throw Forbidden();
    if (!['ASSIGNED', 'ACCEPTED'].includes(booking.status)) {
      throw BadRequest('CANNOT_REJECT', 'Only an assigned, not-yet-started booking can be rejected.');
    }

    const rejectedExpertId = booking.expert_id;
    if (rejectedExpertId) await ExpertModel.setStatus(rejectedExpertId, 'ONLINE');

    // Unassign and put the booking back into the dispatch pool.
    await BookingModel.unassign(req.params.id);
    await BookingModel.addEvent(req.params.id, 'SEARCHING', 'Reassigning your booking to another expert…');
    emitToBooking(req.params.id, 'booking_status_updated', { status: 'SEARCHING', message: 'Reassigning to another expert…' });
    dispatchService.scheduleRetry(req.params.id);

    res.json({ status: 'rejected', rebooking: true });
  },

  // Customer cancels before the service starts.
  async cancel(req, res) {
    const { reason = null } = req.body;
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) throw NotFound('Booking not found.');
    if (!isAdmin(req.user) && booking.customer_id !== req.user.id) throw Forbidden();

    if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw BadRequest('CANNOT_CANCEL', 'This booking can no longer be cancelled.');
    }

    // Refund a prepaid wallet payment back to the customer's wallet.
    const extra = { cancelReason: reason };
    let refunded = 0;
    if (booking.payment_status === 'PAID' && booking.payment_method === 'WALLET') {
      refunded = Number(booking.total_amount);
      await WalletModel.refund(booking.customer_id, refunded, booking.id, 'Refund for cancelled booking');
      extra.paymentStatus = 'REFUNDED';
    }

    await BookingModel.updateStatus(req.params.id, 'CANCELLED', extra);
    await BookingModel.addEvent(req.params.id, 'CANCELLED', STATUS_MESSAGE.CANCELLED);
    // Free the expert back up.
    if (booking.expert_id) await ExpertModel.setStatus(booking.expert_id, 'ONLINE');

    emitToBooking(req.params.id, 'booking_cancelled', { status: 'CANCELLED', refunded });
    if (booking.expert_id) await notify(booking.expert_id, { type: 'booking_cancelled', title: 'Booking cancelled', body: 'A customer cancelled their booking.', bookingId: req.params.id });
    res.json({ status: 'cancelled', refunded });
  },
};
