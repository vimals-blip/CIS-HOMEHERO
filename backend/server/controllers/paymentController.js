import { PaymentTxnModel } from '../models/PaymentTxnModel.js';
import { WalletModel } from '../models/WalletModel.js';
import { PaymentModel } from '../models/PaymentModel.js';
import { BookingModel } from '../models/BookingModel.js';
import { paymentProvider } from '../providers/paymentProvider.js';
import { BadRequest, NotFound, HttpError } from '../errors.js';

const MAX_AMOUNT = 100000;

export const paymentController = {
  async createOrder(req, res) {
    const amount  = Number(req.body.amount);
    const purpose = req.body.purpose === 'BOOKING' ? 'BOOKING' : 'WALLET_TOPUP';
    if (!amount || amount <= 0) throw BadRequest('INVALID_AMOUNT', 'Enter a valid amount.');
    if (amount > MAX_AMOUNT) throw BadRequest('AMOUNT_TOO_LARGE', `Maximum is ₹${MAX_AMOUNT}.`);

    const origin = req.headers.origin || req.headers.referer || '';
    const order  = await paymentProvider.createOrder({ amount, receipt: `rcpt_${Date.now()}`, origin });

    await PaymentTxnModel.create({
      userId:    req.user.id,
      bookingId: req.body.booking_id ?? null,
      orderId:   order.id,
      amount,
      purpose,
      provider:  order.provider ?? 'MOCK',
    });

    res.status(201).json({
      order_id:     order.id,
      amount:       order.amount,       // paise
      currency:     order.currency,
      mock:         Boolean(order.mock),
      key_id:       order.key_id       ?? null,
      provider:     order.provider     ?? 'MOCK',
      checkout_url: order.checkout_url ?? null,  // Stripe only
    });
  },

  async verify(req, res) {
    const { order_id, payment_id, signature } = req.body;
    if (!order_id || !payment_id || !signature) {
      throw BadRequest('MISSING_FIELDS', 'order_id, payment_id and signature are required.');
    }

    const txn = await PaymentTxnModel.findByOrderId(order_id);
    if (!txn) throw NotFound('Payment order not found.');
    if (txn.user_id !== req.user.id) throw new HttpError(403, 'FORBIDDEN', 'Not your payment.');
    if (txn.status === 'PAID') return res.json({ status: 'already_paid' });

    const valid = await paymentProvider.verifyPayment({
      orderId:   order_id,
      paymentId: payment_id,
      signature,
      provider:  txn.provider,
    });

    if (!valid) {
      await PaymentTxnModel.markFailed(txn.id);
      throw new HttpError(400, 'SIGNATURE_INVALID', 'Payment verification failed.');
    }

    await PaymentTxnModel.markPaid(txn.id, payment_id, signature);

    let wallet  = null;
    let booking = null;

    if (txn.purpose === 'WALLET_TOPUP') {
      wallet = await WalletModel.topUp(req.user.id, Number(txn.amount), 'Wallet top-up');
    } else if (txn.purpose === 'BOOKING' && txn.booking_id) {
      booking = await BookingModel.findById(txn.booking_id);
      if (booking && booking.payment_status !== 'PAID') {
        await BookingModel.updateStatus(txn.booking_id, booking.status, { paymentStatus: 'PAID' });
        await PaymentModel.create({ bookingId: txn.booking_id, amount: Number(txn.amount), method: 'CARD', status: 'PAID' });
      }
    }

    res.json({ status: 'paid', purpose: txn.purpose, wallet, booking_id: txn.booking_id ?? null });
  },
};
