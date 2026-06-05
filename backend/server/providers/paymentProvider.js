import crypto from 'node:crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Real Razorpay is used only when both keys are present; otherwise a mock
// provider keeps the entire flow testable without credentials.
export const paymentsEnabled = Boolean(KEY_ID && KEY_SECRET);
export const PROVIDER = paymentsEnabled ? 'RAZORPAY' : 'MOCK';

export const paymentProvider = {
  // Create a gateway order. Amount is in rupees; Razorpay works in paise.
  async createOrder({ amount, receipt }) {
    const amountPaise = Math.round(Number(amount) * 100);

    if (!paymentsEnabled) {
      return {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount: amountPaise, currency: 'INR', mock: true, provider: 'MOCK',
      };
    }

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
    });
    if (!res.ok) throw new Error('Payment gateway order creation failed.');
    const order = await res.json();
    return { id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID, provider: 'RAZORPAY' };
  },

  // Verify the signature returned by checkout. Mock mode accepts a known token.
  verifySignature({ orderId, paymentId, signature }) {
    if (!paymentsEnabled) return signature === 'mock_signature';
    const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  },
};
