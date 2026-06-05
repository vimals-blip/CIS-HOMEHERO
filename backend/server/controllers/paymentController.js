import { PaymentTxnModel } from '../models/PaymentTxnModel.js';
import { WalletModel } from '../models/WalletModel.js';
import { paymentProvider, PROVIDER } from '../providers/paymentProvider.js';
import { BadRequest, NotFound, HttpError } from '../errors.js';

const MAX_AMOUNT = 100000;

export const paymentController = {
  // Create a gateway order for a wallet top-up (booking payments use wallet/cash).
  async createOrder(req, res) {
    const amount = Number(req.body.amount);
    const purpose = req.body.purpose === 'BOOKING' ? 'BOOKING' : 'WALLET_TOPUP';
    if (!amount || amount <= 0) throw BadRequest('INVALID_AMOUNT', 'Enter a valid amount.');
    if (amount > MAX_AMOUNT) throw BadRequest('AMOUNT_TOO_LARGE', `Maximum is ₹${MAX_AMOUNT}.`);

    const order = await paymentProvider.createOrder({ amount, receipt: `rcpt_${Date.now()}` });
    await PaymentTxnModel.create({
      userId: req.user.id, bookingId: req.body.booking_id ?? null,
      orderId: order.id, amount, purpose, provider: order.provider ?? PROVIDER,
    });

    res.status(201).json({
      order_id: order.id,
      amount: order.amount,        // paise
      currency: order.currency,
      mock: Boolean(order.mock),
      key_id: order.key_id ?? null,
      provider: order.provider ?? PROVIDER,
    });
  },

  // Verify a completed payment and fulfil it (credit wallet for top-ups).
  async verify(req, res) {
    const { order_id, payment_id, signature } = req.body;
    if (!order_id || !payment_id || !signature) {
      throw BadRequest('MISSING_FIELDS', 'order_id, payment_id and signature are required.');
    }

    const txn = await PaymentTxnModel.findByOrderId(order_id);
    if (!txn) throw NotFound('Payment order not found.');
    if (txn.user_id !== req.user.id) throw new HttpError(403, 'FORBIDDEN', 'Not your payment.');
    if (txn.status === 'PAID') return res.json({ status: 'already_paid' });

    const valid = paymentProvider.verifySignature({ orderId: order_id, paymentId: payment_id, signature });
    if (!valid) {
      await PaymentTxnModel.markFailed(txn.id);
      throw new HttpError(400, 'SIGNATURE_INVALID', 'Payment verification failed.');
    }

    await PaymentTxnModel.markPaid(txn.id, payment_id, signature);

    let wallet = null;
    if (txn.purpose === 'WALLET_TOPUP') {
      wallet = await WalletModel.topUp(req.user.id, Number(txn.amount), 'Wallet top-up');
    }
    res.json({ status: 'paid', purpose: txn.purpose, wallet });
  },
};
