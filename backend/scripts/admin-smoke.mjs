// Admin smoke test — exercises every admin capability through the gateway as a
// super-admin, and prints a pass/fail table (reads + mutations: config, users,
// experts, withdrawals, support). Run with the stack up:
//   npm run smoke:admin            (from repo root)
//   BASE=https://your-domain/api/v1 node backend/scripts/admin-smoke.mjs
const BASE = process.env.BASE || 'http://localhost:4000/api/v1';
let pass = 0, fail = 0;
const results = [];

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return (await r.json()).accessToken;
}

let TOKEN;
async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  ok ? pass++ : fail++;
}

(async () => {
  TOKEN = await login('superadmin@homehero.test', 'Password123');
  if (!TOKEN) { console.error('LOGIN FAILED'); process.exit(1); }

  // ── Reads ───────────────────────────────────────────────────────────────
  for (const [label, path] of [
    ['overview', '/admin/overview'], ['experts list', '/admin/experts?limit=5'],
    ['users list', '/admin/users?limit=5'], ['bookings list', '/admin/bookings?limit=5'],
    ['withdrawals list', '/admin/withdrawals'], ['audit logs', '/admin/audit-logs?limit=5'],
    ['settings', '/admin/settings'], ['cities', '/admin/cities'], ['banners', '/admin/banners'],
    ['admins list', '/admin/admins'], ['support tickets', '/support/tickets'],
  ]) {
    const r = await api('GET', path); check(`GET ${label}`, r.status === 200, `HTTP ${r.status}`);
  }

  // ── Services: create + toggle ─────────────────────────────────────────────
  const slug = `smoke-svc-${Date.now()}`;
  const cs = await api('POST', '/services', { name: 'Smoke Service', slug, tagline: 't', rate_per_hour: 199, icon_name: 'Sparkles' });
  check('create service', cs.status === 201 || cs.status === 200, `HTTP ${cs.status}`);
  const svcId = cs.json?.id;
  if (svcId) { const t = await api('PATCH', `/services/${svcId}`, { is_active: false }); check('toggle service', t.status === 200, `HTTP ${t.status}`); }

  // ── Coupons: create + toggle ──────────────────────────────────────────────
  const cc = await api('POST', '/admin/coupons', { code: `SMOKE${Date.now() % 100000}`, type: 'FLAT', value: 50 });
  check('create coupon', cc.status === 201 || cc.status === 200, `HTTP ${cc.status}`);
  const cId = cc.json?.id;
  if (cId) { const t = await api('PATCH', `/admin/coupons/${cId}`, { is_active: false }); check('toggle coupon', t.status === 200, `HTTP ${t.status}`); }

  // ── Cities: create + toggle ───────────────────────────────────────────────
  const city = await api('POST', '/admin/cities', { name: `SmokeCity${Date.now() % 100000}` });
  check('create city', city.status === 201 || city.status === 200, `HTTP ${city.status}`);
  const cityId = city.json?.id;
  if (cityId) { const t = await api('PATCH', `/admin/cities/${cityId}`, { is_active: false }); check('toggle city', t.status === 200, `HTTP ${t.status}`); }

  // ── Banners: create + toggle ──────────────────────────────────────────────
  const ban = await api('POST', '/admin/banners', { title: 'Smoke', image_url: 'https://example.com/x.jpg' });
  check('create banner', ban.status === 201 || ban.status === 200, `HTTP ${ban.status}`);
  const banId = ban.json?.id;
  if (banId) { const t = await api('PATCH', `/admin/banners/${banId}`, { is_active: false }); check('toggle banner', t.status === 200, `HTTP ${t.status}`); }

  // ── Settings + CMS page ───────────────────────────────────────────────────
  const ss = await api('POST', '/admin/settings', { key: 'smoke_key', value: 'smoke', is_public: false });
  check('save setting', ss.status === 200 || ss.status === 201, `HTTP ${ss.status}`);
  const pg = await api('PUT', '/admin/pages/smoke', { title: 'Smoke', body: 'hello' });
  check('save CMS page', pg.status === 200 || pg.status === 201, `HTTP ${pg.status}`);

  // ── Users: detail + block/unblock + reset password ────────────────────────
  const users = (await api('GET', '/admin/users?limit=20')).json || [];
  const target = users.find((u) => u.role === 'CUSTOMER');
  if (target) {
    const d = await api('GET', `/admin/users/${target.id}`); check('user detail', d.status === 200, `HTTP ${d.status}`);
    const b = await api('PATCH', `/admin/users/${target.id}`, { is_blocked: true }); check('block user', b.status === 200, `HTTP ${b.status}`);
    const ub = await api('PATCH', `/admin/users/${target.id}`, { is_blocked: false }); check('unblock user', ub.status === 200, `HTTP ${ub.status}`);
    const rp = await api('POST', `/admin/users/${target.id}/reset-password`, {}); check('reset password', rp.status === 200 && !!rp.json?.temp_password, `HTTP ${rp.status}`);
  } else check('user mutations', false, 'no customer to test');

  // ── Experts: verify toggle + document review ──────────────────────────────
  const experts = (await api('GET', '/admin/experts?limit=20')).json || [];
  const ex = experts[0];
  if (ex) {
    const v = await api('PATCH', `/experts/${ex.id}`, { is_verified: true }); check('verify expert', v.status === 200, `HTTP ${v.status}`);
    const docs = (await api('GET', `/experts/${ex.id}/documents`)).json || [];
    if (docs[0]) { const dr = await api('PATCH', `/admin/experts/${ex.id}/documents/${docs[0].id}`, { status: 'APPROVED' }); check('review document', dr.status === 200, `HTTP ${dr.status}`); }
    else check('review document', true, 'skipped (no docs)');
  } else check('expert mutations', false, 'no expert to test');

  // ── Withdrawals: act on a pending one (if any) ────────────────────────────
  const wds = (await api('GET', '/admin/withdrawals')).json || [];
  const pendingWd = wds.find((w) => ['REQUESTED', 'APPROVED'].includes(w.status));
  if (pendingWd) { const w = await api('PATCH', `/admin/withdrawals/${pendingWd.id}`, { action: 'approve' }); check('act on withdrawal', w.status === 200, `HTTP ${w.status}`); }
  else check('act on withdrawal', true, 'skipped (none pending)');

  // ── Support: reply + status (if a ticket exists) ──────────────────────────
  const tickets = (await api('GET', '/support/tickets')).json || [];
  if (tickets[0]) {
    const rep = await api('POST', `/support/tickets/${tickets[0].id}/messages`, { body: 'smoke reply' }); check('support reply', rep.status === 200 || rep.status === 201, `HTTP ${rep.status}`);
    const st = await api('PATCH', `/support/tickets/${tickets[0].id}/status`, { status: 'IN_PROGRESS' }); check('support status', st.status === 200, `HTTP ${st.status}`);
  } else check('support actions', true, 'skipped (no tickets)');

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\nADMIN SMOKE TEST\n' + '─'.repeat(48));
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.label.padEnd(22)} ${r.detail}`);
  console.log('─'.repeat(48) + `\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
