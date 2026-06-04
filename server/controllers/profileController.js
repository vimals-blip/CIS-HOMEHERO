import bcrypt from 'bcryptjs';
import { ProfileModel } from '../models/ProfileModel.js';
import { BadRequest, NotFound, HttpError } from '../errors.js';

export const profileController = {
  async getMe(req, res) {
    const me = await ProfileModel.getMe(req.user.id);
    if (!me) throw NotFound('Account not found.');
    res.json(me);
  },

  async updateMe(req, res) {
    const { name, phone, city, avatar_url } = req.body;
    if (name !== undefined && String(name).trim().length < 2) throw BadRequest('INVALID_NAME', 'Name must be at least 2 characters.');
    if (phone !== undefined && String(phone).length > 20) throw BadRequest('INVALID_PHONE', 'Phone is too long.');
    await ProfileModel.updateProfile(req.user.id, { name, phone, city, avatarUrl: avatar_url });
    const me = await ProfileModel.getMe(req.user.id);
    res.json(me);
  },

  async changePassword(req, res) {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) throw BadRequest('MISSING_FIELDS', 'current_password and new_password are required.');
    if (new_password.length < 6) throw BadRequest('WEAK_PASSWORD', 'New password must be at least 6 characters.');

    const hash = await ProfileModel.getPasswordHash(req.user.id);
    if (!hash) throw NotFound('Account not found.');
    const ok = await bcrypt.compare(current_password, hash);
    if (!ok) throw new HttpError(401, 'WRONG_PASSWORD', 'Your current password is incorrect.');

    const newHash = await bcrypt.hash(new_password, 10);
    await ProfileModel.updatePassword(req.user.id, newHash);
    res.json({ status: 'updated' });
  },
};
