import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { BookingModel } from '../models/BookingModel.js';
import { ExpertModel } from '../models/ExpertModel.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACTIVE = ['SEARCHING', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

let io = null;

export function getIO() {
  return io;
}

// Room helpers — controllers call these to push realtime updates.
export function emitToBooking(bookingId, event, payload) {
  io?.to(`booking:${bookingId}`).emit(event, { booking_id: bookingId, ...payload });
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function initRealtime(server) {
  io = new Server(server, {
    cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  });

  // Authenticate every socket with the access JWT from the handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const payload = jwt.verify(token, SECRET);
      socket.user = { id: payload.user_id, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error('TOKEN_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    socket.join(`user:${userId}`);

    // Customers/experts subscribe to a booking they're party to.
    socket.on('subscribe_booking', async (bookingId, ack) => {
      try {
        const booking = await BookingModel.findById(bookingId);
        if (!booking) return ack?.({ ok: false, error: 'NOT_FOUND' });
        const allowed = role === 'ADMIN' || booking.customer_id === userId || booking.expert_id === userId;
        if (!allowed) return ack?.({ ok: false, error: 'FORBIDDEN' });
        socket.join(`booking:${bookingId}`);
        ack?.({ ok: true, status: booking.status, eta_minutes: booking.eta_minutes });
      } catch {
        ack?.({ ok: false, error: 'ERROR' });
      }
    });

    socket.on('unsubscribe_booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    // Experts stream their GPS location; we persist it and fan out to the
    // rooms of their currently-active bookings.
    socket.on('expert_location', async ({ lat, lng }) => {
      if (role !== 'EXPERT' || lat == null || lng == null) return;
      try {
        await ExpertModel.setLocation(userId, lat, lng);
        const bookings = await BookingModel.findForExpert(userId);
        for (const b of bookings) {
          if (ACTIVE.includes(b.status)) {
            emitToBooking(b.id, 'expert_location_updated', { lat, lng, at: Date.now() });
          }
        }
      } catch { /* best-effort */ }
    });
  });

  console.log('Socket.IO realtime ready');
  return io;
}
