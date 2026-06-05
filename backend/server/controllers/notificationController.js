import { NotificationModel } from '../models/NotificationModel.js';
import { BadRequest } from '../errors.js';

export const notificationController = {
  async list(req, res) {
    const [notifications, unread] = await Promise.all([
      NotificationModel.listForUser(req.user.id),
      NotificationModel.unreadCount(req.user.id),
    ]);
    res.json({ notifications, unread });
  },

  async markRead(req, res) {
    await NotificationModel.markRead(req.params.id, req.user.id);
    res.json({ status: 'read' });
  },

  async markAllRead(req, res) {
    await NotificationModel.markAllRead(req.user.id);
    res.json({ status: 'read_all' });
  },

  async registerDevice(req, res) {
    const { token, platform } = req.body;
    if (!token) throw BadRequest('MISSING_TOKEN', 'token is required.');
    await NotificationModel.saveDeviceToken(req.user.id, token, platform);
    res.status(201).json({ status: 'registered' });
  },
};
