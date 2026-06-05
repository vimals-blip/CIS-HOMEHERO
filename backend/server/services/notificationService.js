import { NotificationModel } from '../models/NotificationModel.js';
import { fcmProvider } from '../providers/fcmProvider.js';
import { emitToUser } from '../realtime/io.js';

// Single entry point for delivering a notification: persist it, push it over
// the socket for in-app display, and fire an FCM push (best-effort).
export async function notify(userId, { type, title, body, bookingId }) {
  try {
    const id = await NotificationModel.create({ userId, type, title, body, bookingId });
    emitToUser(userId, 'notification_received', { id, type, title, body, booking_id: bookingId });

    const tokens = await NotificationModel.deviceTokens(userId);
    if (tokens.length) {
      fcmProvider.send(tokens, { title, body, data: { type, booking_id: bookingId ?? '' } }).catch(() => {});
    }
  } catch { /* notifications are best-effort, never block the main flow */ }
}
