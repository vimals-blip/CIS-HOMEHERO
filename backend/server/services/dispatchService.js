import { ExpertModel } from '../models/ExpertModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { emitToBooking } from '../realtime/io.js';
import { notify } from './notificationService.js';
import { initDispatchQueue, enqueueDispatchRetry } from '../queues/dispatchQueue.js';

const RADIUS_KM = Number(process.env.DISPATCH_RADIUS_KM || 15);
const RETRY_MS = Number(process.env.DISPATCH_RETRY_MS || 8000);
const MAX_RETRIES = Number(process.env.DISPATCH_MAX_RETRIES || 5);
const ACTIVE = ['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

// Great-circle distance in km.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const dispatchService = {
  // Rank rule: nearest (ETA proxy) → highest rating → lowest active load.
  async findBestExpert(serviceId, coords) {
    const candidates = await ExpertModel.findCandidatesForService(serviceId);
    if (!candidates.length) return null;

    const hasBookingCoords = coords?.lat != null && coords?.lng != null;
    const ranked = candidates
      .map((e) => {
        const hasExpertCoords = e.current_lat != null && e.current_lng != null;
        const distance = hasBookingCoords && hasExpertCoords
          ? haversineKm({ lat: Number(coords.lat), lng: Number(coords.lng) }, { lat: Number(e.current_lat), lng: Number(e.current_lng) })
          : null;
        return { expert: e, distance, rating: Number(e.avg_rating || 0), load: Number(e.active_jobs || 0) };
      })
      // Honour the radius only when we can actually measure distance.
      .filter((c) => c.distance == null || c.distance <= RADIUS_KM);

    if (!ranked.length) return null;
    ranked.sort((x, y) => {
      const dx = x.distance ?? Infinity, dy = y.distance ?? Infinity;
      if (dx !== dy) return dx - dy;
      if (x.rating !== y.rating) return y.rating - x.rating;
      return x.load - y.load;
    });
    return { expert: ranked[0].expert, distance: ranked[0].distance };
  },

  // Estimated arrival: distance-based when known, else a short urban default.
  etaMinutes(distanceKm) {
    if (distanceKm == null) return 6 + Math.floor(Math.random() * 9); // 6–14 min
    return Math.max(3, Math.round((distanceKm / 25) * 60) + 3); // ~25 km/h + buffer
  },

  // Kick off background retry for a booking still SEARCHING.
  scheduleRetry(bookingId, attempt = 1) {
    if (attempt > MAX_RETRIES) return;
    enqueueDispatchRetry(bookingId, attempt);
  },

  // Immediately attempt to assign an expert — no delay.
  // Used when an expert comes online and we already know there are SEARCHING bookings.
  async dispatchImmediate(bookingId) {
    try {
      await this.attemptAssign({ bookingId, attempt: 1 });
    } catch (err) {
      console.error(`[dispatch] Immediate dispatch failed for booking ${bookingId}:`, err);
      // Fall back to the retry queue so the booking doesn't get stuck.
      this.scheduleRetry(bookingId, 1);
    }
  },

  // Worker processor: try to assign an expert; re-enqueue if none yet.
  async attemptAssign({ bookingId, attempt = 1 }) {
    try {
      const booking = await BookingModel.findById(bookingId);
      if (!booking || booking.status !== 'SEARCHING') return; // assigned/cancelled meanwhile
      // Do not dispatch if it's an online payment that hasn't been paid yet.
      if (booking.payment_method === 'ONLINE' && booking.payment_status !== 'PAID') return;

      const match = await this.findBestExpert(booking.service_id, { lat: booking.lat, lng: booking.lng });
      if (!match) {
        if (attempt < MAX_RETRIES) enqueueDispatchRetry(bookingId, attempt + 1);
        else console.log(`[dispatch] Booking ${bookingId}: exhausted ${MAX_RETRIES} retries, will re-dispatch when an expert comes online.`);
        return;
      }

      const eta = this.etaMinutes(match.distance);
      await BookingModel.assignExpert(bookingId, match.expert.id, eta);
      await BookingModel.addEvent(bookingId, 'ASSIGNED', 'Expert assigned to your booking.');
      if (booking.booking_type === 'INSTANT' && match.expert.status === 'ONLINE') {
        await ExpertModel.setStatus(match.expert.id, 'BUSY');
      }
      emitToBooking(bookingId, 'booking_assigned', { status: 'ASSIGNED', eta_minutes: eta, expert_id: match.expert.id });
      await notify(booking.customer_id, { type: 'booking_assigned', title: 'Expert assigned', body: `Your expert is arriving in ~${eta} min.`, bookingId });
      await notify(match.expert.id, { type: 'job_assigned', title: 'New job assigned', body: 'You have a new booking.', bookingId });
      console.log(`[dispatch] Booking ${bookingId} → assigned to expert ${match.expert.id} (ETA ${eta} min)`);
    } catch (err) {
      console.error(`[dispatch] attemptAssign error for booking ${bookingId}:`, err);
      // Re-enqueue on transient errors instead of silently dropping.
      if (attempt < MAX_RETRIES) {
        enqueueDispatchRetry(bookingId, attempt + 1);
      }
    }
  },

  isActiveStatus(status) {
    return ACTIVE.includes(status);
  },
};

// Wire the queue worker to the dispatch processor (BullMQ or in-process).
initDispatchQueue((data) => dispatchService.attemptAssign(data));
