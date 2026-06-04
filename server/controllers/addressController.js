import { AddressModel } from '../models/AddressModel.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

export const addressController = {
  async list(req, res) {
    const rows = await AddressModel.listByCustomer(req.user.id);
    res.json(rows);
  },

  async create(req, res) {
    const { label, flat, address_line, landmark, city, pincode, lat, lng, is_default } = req.body;
    if (!address_line || !city || !pincode) {
      throw BadRequest('MISSING_FIELDS', 'address_line, city and pincode are required.');
    }
    const id = await AddressModel.create({
      customerId: req.user.id, label, flat, addressLine: address_line, landmark,
      city, pincode, lat, lng, isDefault: is_default,
    });
    res.status(201).json({ id });
  },

  async setDefault(req, res) {
    const addr = await AddressModel.findById(req.params.id);
    if (!addr) throw NotFound('Address not found.');
    if (addr.customer_id !== req.user.id) throw Forbidden();
    await AddressModel.setDefault(req.user.id, req.params.id);
    res.json({ status: 'updated' });
  },

  async remove(req, res) {
    const addr = await AddressModel.findById(req.params.id);
    if (!addr) throw NotFound('Address not found.');
    if (addr.customer_id !== req.user.id) throw Forbidden();
    await AddressModel.remove(req.params.id);
    res.json({ status: 'deleted' });
  },
};
