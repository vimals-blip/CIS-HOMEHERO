// HomeHero load test (k6) — models launch-scale traffic through the gateway.
//
// k6 is a standalone binary (not Node). Install: https://grafana.com/docs/k6/latest/set-up/install-k6/
//   macOS:  brew install k6
//   Debian: sudo gpg -k && sudo apt-get install k6   (see docs for the repo key)
//   Docker: docker run --rm -i grafana/k6 run - <backend/scripts/load-test.js
//
// Run (stack must be up + seeded):
//   k6 run backend/scripts/load-test.js
//   BASE=https://your-domain/api/v1 k6 run backend/scripts/load-test.js
//   PROFILE=soak k6 run backend/scripts/load-test.js      # long steady run
//   PEAK_VUS=600 k6 run backend/scripts/load-test.js       # override peak load
//
// ⚠ Rate limiting: the API limits per client IP (apiLimiter 300/min, authLimiter
// 20/15min). A load test hits from ONE IP, so all VUs share one bucket and you'll
// see 429s, not real capacity. Run the target with the limits raised, e.g.:
//   RATE_LIMIT_API=1000000 RATE_LIMIT_AUTH=1000000 RATE_LIMIT_OTP=1000000 npm run api
// (or point BASE at a staging box configured the same way). Never load-test prod.
//
// Traffic model (matches a real on-demand app at launch): the vast majority of
// requests are anonymous homepage/browse reads (which should now hit the cache);
// a smaller slice logs in and runs the booking funnel.
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE = __ENV.BASE || 'http://localhost:4000/api/v1';
const PEAK_VUS = Number(__ENV.PEAK_VUS || 300);
const CUSTOMER_EMAIL = __ENV.CUSTOMER_EMAIL || 'customer@snabbit.test';
const CUSTOMER_PASSWORD = __ENV.CUSTOMER_PASSWORD || 'Password123';

// Custom metrics for the journeys we care about most.
const browseLatency = new Trend('browse_latency', true);
const bookingLatency = new Trend('booking_latency', true);
const cacheHitRate = new Rate('cache_hit_rate');

// Load profiles. Default = ramp to peak and back; soak = long steady plateau.
const PROFILES = {
  default: [
    { duration: '30s', target: Math.ceil(PEAK_VUS * 0.2) }, // warm up
    { duration: '1m', target: PEAK_VUS },                    // ramp to peak
    { duration: '2m', target: PEAK_VUS },                    // hold peak
    { duration: '30s', target: 0 },                          // ramp down
  ],
  soak: [
    { duration: '1m', target: Math.ceil(PEAK_VUS * 0.5) },
    { duration: '20m', target: Math.ceil(PEAK_VUS * 0.5) },
    { duration: '1m', target: 0 },
  ],
  spike: [
    { duration: '10s', target: PEAK_VUS },     // sudden surge
    { duration: '1m', target: PEAK_VUS },
    { duration: '10s', target: 0 },
  ],
};

export const options = {
  stages: PROFILES[__ENV.PROFILE] || PROFILES.default,
  thresholds: {
    // Launch SLOs — tighten/relax against real numbers after the first run.
    http_req_failed: ['rate<0.01'],                 // <1% errors
    http_req_duration: ['p(95)<800', 'p(99)<1500'], // overall latency budget
    browse_latency: ['p(95)<400'],                  // cached reads should be fast
    booking_latency: ['p(95)<1200'],                // write path budget
  },
};

const PINCODES = ['560001', '400001', '110001', '500001', '411001'];

function authHeaders(token) {
  return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
}
const jsonHeaders = { headers: { 'Content-Type': 'application/json' } };

function browse() {
  group('anonymous browse', () => {
    const res = http.batch([
      ['GET', `${BASE}/services`, null, jsonHeaders],
      ['GET', `${BASE}/cms/banners`, null, jsonHeaders],
      ['GET', `${BASE}/cms/settings`, null, jsonHeaders],
      ['GET', `${BASE}/cms/cities`, null, jsonHeaders],
    ]);
    const services = res[0];
    browseLatency.add(services.timings.duration);
    check(services, { 'services 200': (r) => r.status === 200 });
    // Track cache effectiveness via the X-Cache header our middleware sets.
    res.forEach((r) => {
      const xc = r.headers['X-Cache'];
      if (xc) cacheHitRate.add(xc === 'HIT');
    });
  });
}

function bookingFunnel() {
  group('customer booking funnel', () => {
    const login = http.post(`${BASE}/auth/login`,
      JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }), jsonHeaders);
    if (!check(login, { 'login 200': (r) => r.status === 200 })) return;
    const token = login.json('accessToken');
    if (!token) return;

    http.get(`${BASE}/me`, authHeaders(token));
    const servicesRes = http.get(`${BASE}/services`, authHeaders(token));
    const services = servicesRes.json() || [];
    http.get(`${BASE}/bookings`, authHeaders(token));

    if (services.length > 0) {
      const svc = randomItem(services);
      const start = Date.now();
      const booking = http.post(`${BASE}/bookings`, JSON.stringify({
        service_id: svc.id, duration_hours: 2, booking_type: 'INSTANT',
        address_snapshot: '12 Load Test St, Bengaluru',
        pincode: randomItem(PINCODES), payment_method: 'CASH',
      }), authHeaders(token));
      bookingLatency.add(Date.now() - start);
      check(booking, { 'booking created': (r) => r.status >= 200 && r.status < 300 });
    }
  });
}

// 80% browse-only, 20% run the booking funnel — roughly real launch behavior.
export default function () {
  if (Math.random() < 0.8) {
    browse();
  } else {
    bookingFunnel();
  }
  sleep(Math.random() * 3 + 1); // 1–4s think time between actions
}
