import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthModel } from '../models/AuthModel.js';
import { BadRequest, Conflict, HttpError } from '../errors.js';

export const authController = {
  async signup(req, res) {
    const {
      email, password,
      name = null, phone = null, role = 'CUSTOMER', city = null,
      bio = null, experience_years = null, hourly_rate = null,
      category_ids = [],
    } = req.body;

    if (!email || !password) throw BadRequest('MISSING_FIELDS', 'Email and password are required.');

    if (await AuthModel.emailExists(email)) {
      throw Conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await AuthModel.createUser({ email, passwordHash, name, city, phone, role });

    if (role === 'PROVIDER') {
      await AuthModel.createProviderProfile(userId, {
        bio, experienceYears: experience_years, hourlyRate: hourly_rate,
      });
      if (Array.isArray(category_ids) && category_ids.length) {
        await AuthModel.addProviderCategories(userId, category_ids);
      }
    }

    res.status(201).json({ id: userId, email, role });
  },

  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) throw BadRequest('MISSING_FIELDS', 'Email and password are required.');

    const user = await AuthModel.findByEmail(email);
    const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !validPassword) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const role = await AuthModel.getRoleByUserId(user.id);
    const token = jwt.sign(
      { user_id: user.id, email: user.email, role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' },
    );

    res.json({ token, user: { id: user.id, email: user.email, role } });
  },
};
