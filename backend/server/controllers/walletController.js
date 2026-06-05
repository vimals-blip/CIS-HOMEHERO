import { WalletModel } from '../models/WalletModel.js';
import { WithdrawalModel } from '../models/WithdrawalModel.js';
import { ExpertModel } from '../models/ExpertModel.js';
import { isAdmin } from '../middleware/auth.js';
import { BadRequest, Forbidden } from '../errors.js';

const MAX_TOPUP = 50000;
const MIN_WITHDRAWAL = 100;

export const walletController = {
  // Expert earnings wallet (kept for the expert dashboard).
  async get(req, res) {
    const { expertId } = req.params;
    if (req.user.id !== expertId && !isAdmin(req.user)) throw Forbidden();
    const wallet = await WalletModel.findByExpert(expertId);
    res.json(wallet);
  },

  // Expert requests a payout against their available balance.
  async withdraw(req, res) {
    const { expertId } = req.params;
    if (req.user.id !== expertId && !isAdmin(req.user)) throw Forbidden();
    const amount = Number(req.body.amount);
    if (!amount || amount < MIN_WITHDRAWAL) throw BadRequest('INVALID_AMOUNT', `Minimum withdrawal is ₹${MIN_WITHDRAWAL}.`);

    const wallet = await WalletModel.findByExpert(expertId);
    if (wallet.available_balance < amount) throw BadRequest('INSUFFICIENT_BALANCE', 'Withdrawal exceeds your available balance.');

    // Hold the funds immediately; admin settles the request later.
    await WalletModel.debitExpert(expertId, amount);
    const id = await WithdrawalModel.create({
      expertId, amount, bankAccount: req.body.bank_account, bankIfsc: req.body.bank_ifsc,
    });
    res.status(201).json({ id, status: 'REQUESTED', available_balance: wallet.available_balance - amount });
  },

  async withdrawals(req, res) {
    const { expertId } = req.params;
    if (req.user.id !== expertId && !isAdmin(req.user)) throw Forbidden();
    res.json(await WithdrawalModel.listForExpert(expertId));
  },

  // Per-job earnings history (who booked, what, how much earned).
  async earnings(req, res) {
    const { expertId } = req.params;
    if (req.user.id !== expertId && !isAdmin(req.user)) throw Forbidden();
    res.json(await ExpertModel.earningsHistory(expertId));
  },

  // Customer prepaid wallet — balance + recent ledger.
  async getMine(req, res) {
    const wallet = await WalletModel.getCustomer(req.user.id);
    const transactions = await WalletModel.transactionsForUser(req.user.id);
    res.json({ ...wallet, transactions });
  },

  // Top up the customer wallet. In production this is gated behind a verified
  // Razorpay payment (Slice 4); for now it credits directly.
  async topUp(req, res) {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) throw BadRequest('INVALID_AMOUNT', 'Enter a valid top-up amount.');
    if (amount > MAX_TOPUP) throw BadRequest('AMOUNT_TOO_LARGE', `Maximum top-up is ₹${MAX_TOPUP}.`);
    const wallet = await WalletModel.topUp(req.user.id, Math.round(amount * 100) / 100, 'Wallet top-up');
    res.json(wallet);
  },
};
