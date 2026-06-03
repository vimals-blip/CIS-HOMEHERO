import { WalletModel } from '../models/WalletModel.js';
import { Forbidden } from '../errors.js';

export const walletController = {
  async get(req, res) {
    const { providerId } = req.params;
    if (req.user.id !== providerId && req.user.role !== 'ADMIN') throw Forbidden();
    const wallet = await WalletModel.findByProvider(providerId);
    res.json(wallet);
  },
};
