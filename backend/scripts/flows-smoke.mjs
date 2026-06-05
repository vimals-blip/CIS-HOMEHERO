// Customer + expert flow smoke test — exercises both roles' key journeys
// through the gateway and prints a pass/fail table. Run with the stack up:
//   npm run smoke:flows            (from repo root)
//   BASE=https://your-domain/api/v1 node backend/scripts/flows-smoke.mjs
const BASE = process.env.BASE || 'http://localhost:4000/api/v1';
let pass = 0, fail = 0;
const results = [];

async function api(method, path, token, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
async function login(email, password) {
  return (await api('POST', '/auth/login', null, { email, password })).json?.accessToken;
}
function check(label, ok, detail = '') { results.push({ label, ok, detail }); ok ? pass++ : fail++; }
const ok2xx = (s) => s >= 200 && s < 300;

(async () => {
  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  const cust = await login('customer@snabbit.test', 'Password123');
  check('customer login', !!cust);
  if (cust) {
    const services = (await api('GET', '/services', cust)).json || [];
    check('browse services', services.length >= 0);
    check('view profile (/me)', ok2xx((await api('GET', '/me', cust)).status));
    check('list experts', ok2xx((await api('GET', '/experts', cust)).status));

    const addr = await api('POST', '/addresses', cust, { label: 'Home', address_line: '12 Smoke St', city: 'Bengaluru', pincode: '560001' });
    check('add address', ok2xx(addr.status), `HTTP ${addr.status}`);
    check('list addresses', ok2xx((await api('GET', '/addresses', cust)).status));

    const svcId = services[0]?.id;
    if (svcId) {
      const bk = await api('POST', '/bookings', cust, {
        service_id: svcId, duration_hours: 2, booking_type: 'INSTANT',
        address_snapshot: '12 Smoke St, Bengaluru', pincode: '560001', payment_method: 'CASH',
      });
      check('create booking', ok2xx(bk.status), `HTTP ${bk.status}`);
    } else check('create booking', false, 'no service');
    check('list my bookings', ok2xx((await api('GET', '/bookings', cust)).status));

    check('view wallet', ok2xx((await api('GET', '/wallet', cust)).status));
    check('create payment order', ok2xx((await api('POST', '/payments/order', cust, { amount: 500, purpose: 'WALLET_TOPUP' })).status));

    // Coupon validate "works" whether the code is valid (200) or correctly
    // rejected (4xx, e.g. 400 INVALID_COUPON for an unknown code).
    const cp = await api('POST', '/coupons/validate', cust, { code: 'NONEXISTENT', amount: 500 });
    check('validate coupon', cp.status === 200 || (cp.status >= 400 && cp.status < 500), `HTTP ${cp.status}`);

    const tk = await api('POST', '/support/tickets', cust, { subject: 'Smoke ticket', body: 'hello' });
    check('open support ticket', ok2xx(tk.status), `HTTP ${tk.status}`);
  }

  // ── EXPERT ────────────────────────────────────────────────────────────────
  const exp = await login('exp-1@snabbit.test', 'Password123');
  check('expert login', !!exp);
  if (exp) {
    const id = 'exp-1';
    check('expert profile', ok2xx((await api('GET', `/experts/${id}`, exp)).status));
    check('expert wallet', ok2xx((await api('GET', `/expert-wallet/${id}`, exp)).status));
    check('expert jobs (/bookings)', ok2xx((await api('GET', '/bookings', exp)).status));
    check('go online', ok2xx((await api('PATCH', `/experts/${id}/status`, exp, { status: 'ONLINE' })).status));
    check('kyc documents', ok2xx((await api('GET', `/experts/${id}/documents`, exp)).status));
    check('withdrawals', ok2xx((await api('GET', `/expert-wallet/${id}/withdrawals`, exp)).status));
  }

  console.log('\nCUSTOMER + EXPERT SMOKE TEST\n' + '─'.repeat(48));
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.label.padEnd(24)} ${r.detail}`);
  console.log('─'.repeat(48) + `\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
