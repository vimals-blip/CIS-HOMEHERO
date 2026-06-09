import crypto from 'node:crypto';
import prisma from '../prisma.js';

// 10-second in-memory cache so we don't hit the DB on every payment request.
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 10_000;

const CONFIG_KEYS = [
  'payment_gateway', 'payment_mode',
  'razorpay_test_key_id',    'razorpay_test_key_secret',
  'razorpay_live_key_id',    'razorpay_live_key_secret',
  'stripe_test_secret_key',  'stripe_test_publishable_key',
  'stripe_live_secret_key',  'stripe_live_publishable_key',
];

async function getGatewayConfig() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const rows = await prisma.settings.findMany({ where: { setting_key: { in: CONFIG_KEYS } } });
  const s = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value ?? '']));

  const gateway = s.payment_gateway || process.env.PAYMENT_GATEWAY || 'RAZORPAY';
  const mode    = s.payment_mode    || process.env.PAYMENT_MODE    || 'TEST';

  let config;
  if (gateway === 'STRIPE') {
    const secretKey     = mode === 'LIVE'
      ? (s.stripe_live_secret_key      || process.env.STRIPE_LIVE_SECRET_KEY      || '')
      : (s.stripe_test_secret_key      || process.env.STRIPE_TEST_SECRET_KEY      || '');
    const publishableKey = mode === 'LIVE'
      ? (s.stripe_live_publishable_key || process.env.STRIPE_LIVE_PUBLISHABLE_KEY || '')
      : (s.stripe_test_publishable_key || process.env.STRIPE_TEST_PUBLISHABLE_KEY || '');
    config = { gateway: 'STRIPE', mode, secretKey, publishableKey, enabled: Boolean(secretKey) };
  } else {
    const keyId = mode === 'LIVE'
      ? (s.razorpay_live_key_id     || process.env.RAZORPAY_LIVE_KEY_ID     || process.env.RAZORPAY_KEY_ID     || '')
      : (s.razorpay_test_key_id     || process.env.RAZORPAY_TEST_KEY_ID     || process.env.RAZORPAY_KEY_ID     || '');
    const keySecret = mode === 'LIVE'
      ? (s.razorpay_live_key_secret  || process.env.RAZORPAY_LIVE_KEY_SECRET  || process.env.RAZORPAY_KEY_SECRET  || '')
      : (s.razorpay_test_key_secret  || process.env.RAZORPAY_TEST_KEY_SECRET  || process.env.RAZORPAY_KEY_SECRET  || '');
    config = { gateway: 'RAZORPAY', mode, keyId, keySecret, enabled: Boolean(keyId && keySecret) };
  }

  _cache    = config;
  _cacheAt  = Date.now();
  return config;
}

// Call this after saving new keys so the next request picks up the change immediately.
export function invalidateGatewayCache() {
  _cache = null;
}

export const paymentProvider = {
  async createOrder({ amount, receipt, origin, description = null, metadata = {} }) {
    const cfg = await getGatewayConfig();
    const amountPaise = Math.round(Number(amount) * 100);

    // No keys configured → safe mock so dev/staging works without credentials.
    if (!cfg.enabled) {
      return {
        id:       `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount:   amountPaise,
        currency: 'INR',
        mock:     true,
        provider: 'MOCK',
      };
    }

    if (cfg.gateway === 'STRIPE') {
      const baseUrl    = (origin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      // receipt format: "booking_BOOKINGID" for bookings, "rcpt_TIMESTAMP" for wallet
      const bookingId  = receipt.startsWith('booking_') ? receipt.slice(8) : null;
      const successUrl = bookingId
        ? `${baseUrl}/track/${bookingId}?stripe_done={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/wallet?stripe_done={CHECKOUT_SESSION_ID}`;
      const cancelUrl  = bookingId
        ? `${baseUrl}/bookings`
        : `${baseUrl}/wallet?stripe_cancel=1`;

      const productName = description || (bookingId ? 'HomeHero Booking' : 'HomeHero Wallet Top-up');

      const params = new URLSearchParams({
        'payment_method_types[]':                             'card',
        'line_items[0][price_data][currency]':                'inr',
        'line_items[0][price_data][unit_amount]':             String(amountPaise),
        'line_items[0][price_data][product_data][name]':      productName,
        'line_items[0][quantity]':                            '1',
        'mode':                                               'payment',
        'success_url':                                        successUrl,
        'cancel_url':                                         cancelUrl,
        // Description appears next to the payment in the Stripe dashboard
        'payment_intent_data[description]':                   productName,
      });

      // Attach structured metadata so every payment is traceable in the dashboard
      const allMeta = { source: 'homehero', receipt, ...metadata };
      for (const [k, v] of Object.entries(allMeta)) {
        if (v != null) params.append(`payment_intent_data[metadata][${k}]`, String(v));
      }

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization:   `Bearer ${cfg.secretKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Stripe checkout session creation failed');
      }
      const session = await res.json();
      return {
        id:           session.id,
        amount:       amountPaise,
        currency:     'INR',
        provider:     'STRIPE',
        checkout_url: session.url,
      };
    }

    // ── Razorpay ──────────────────────────────────────────────────────────────
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  'Basic ' + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        ...(description && { description }),
        notes: { source: 'homehero', receipt, ...metadata },
      }),
    });
    if (!res.ok) throw new Error('Razorpay order creation failed.');
    const order = await res.json();
    return { id: order.id, amount: order.amount, currency: order.currency, key_id: cfg.keyId, provider: 'RAZORPAY' };
  },

  async verifyPayment({ orderId, paymentId, signature, provider }) {
    if (!provider || provider === 'MOCK') return signature === 'mock_signature';

    if (provider === 'STRIPE') {
      const cfg = await getGatewayConfig();
      if (!cfg.enabled || cfg.gateway !== 'STRIPE') return false;
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${orderId}`, {
        headers: { Authorization: `Bearer ${cfg.secretKey}` },
      });
      if (!res.ok) return false;
      const session = await res.json();
      return session.payment_status === 'paid';
    }

    // ── Razorpay HMAC ─────────────────────────────────────────────────────────
    const cfg    = await getGatewayConfig();
    const secret = cfg.enabled ? cfg.keySecret : (process.env.RAZORPAY_KEY_SECRET || '');
    if (!secret) return signature === 'mock_signature';
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  },
};
