import bcrypt from 'bcryptjs';
import { query } from './db.js';

// Demo password shared by every seeded login account.
const DEMO_PASSWORD = 'Password123';

// ----------------------------------------------------------------------------
// Services — curated household help, priced per hour
// ----------------------------------------------------------------------------
const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=70`;

const services = [
  { id: 'svc-cleaning',   name: 'Home Cleaning',     slug: 'home-cleaning',   tagline: 'Sweeping, mopping & dusting', icon_name: 'Sparkles', rate_per_hour: 199, min_hours: 1, sort_order: 1, description: 'Sweeping, mopping, dusting and tidying up your home.', image_url: IMG('photo-1581578731548-c64695cc6952') },
  { id: 'svc-dishes',     name: 'Dishwashing',       slug: 'dishwashing',     tagline: 'Sparkling clean utensils',    icon_name: 'Utensils', rate_per_hour: 169, min_hours: 1, sort_order: 2, description: 'A trained expert washes, dries and stacks all your utensils.', image_url: IMG('photo-1556910103-1c02745aae4d') },
  { id: 'svc-kitchen',    name: 'Kitchen Cleaning',  slug: 'kitchen-cleaning',tagline: 'Counters, stove & sink',      icon_name: 'CookingPot', rate_per_hour: 229, min_hours: 1, sort_order: 3, description: 'Deep clean of counters, stove, sink and kitchen surfaces.', image_url: IMG('photo-1556911220-bff31c812dba') },
  { id: 'svc-bathroom',   name: 'Bathroom Cleaning', slug: 'bathroom-cleaning',tagline: 'Spotless & sanitised',       icon_name: 'ShowerHead', rate_per_hour: 249, min_hours: 1, sort_order: 4, description: 'Scrubbing and sanitising of toilets, tiles and fittings.', image_url: IMG('photo-1584622650111-993a426fbf0a') },
  { id: 'svc-laundry',    name: 'Laundry Help',      slug: 'laundry-help',    tagline: 'Wash, dry & fold',            icon_name: 'Shirt', rate_per_hour: 179, min_hours: 1, sort_order: 5, description: 'Washing, drying, folding and organising your laundry.', image_url: IMG('photo-1545173168-9f1947eebb7f') },
  { id: 'svc-cooking',    name: 'Cooking Help',      slug: 'cooking-help',    tagline: 'Chopping, prep & cooking',    icon_name: 'ChefHat', rate_per_hour: 269, min_hours: 1, sort_order: 6, description: 'Vegetable chopping, dough kneading and basic meal prep.', image_url: IMG('photo-1556909212-d5b604d0c90d') },
];

// ----------------------------------------------------------------------------
// Experts — trained, verified, all-female workforce
// ----------------------------------------------------------------------------
const PORTRAIT = (n) => `https://randomuser.me/api/portraits/women/${n}.jpg`;

const experts = [
  { id: 'exp-1', name: 'Lakshmi Nair',  city: 'Bengaluru', phone: '9876500001', avatar: PORTRAIT(68), bio: 'Cleaning & dishwashing specialist with 6 years of experience.', experience_years: 6, avg_rating: 4.9, review_count: 312, total_jobs: 1240, status: 'ONLINE',  services: ['svc-cleaning', 'svc-dishes', 'svc-kitchen'] },
  { id: 'exp-2', name: 'Priya Sharma',  city: 'Bengaluru', phone: '9876500002', avatar: PORTRAIT(65), bio: 'Expert in kitchen and bathroom deep cleaning. Friendly and thorough.', experience_years: 4, avg_rating: 4.8, review_count: 198, total_jobs: 760,  status: 'ONLINE',  services: ['svc-kitchen', 'svc-bathroom', 'svc-cleaning'] },
  { id: 'exp-3', name: 'Anjali Verma',  city: 'Mumbai',    phone: '9876500003', avatar: PORTRAIT(44), bio: 'Loves cooking help and laundry. Punctual and warm.',              experience_years: 5, avg_rating: 4.9, review_count: 256, total_jobs: 980,  status: 'ONLINE',  services: ['svc-cooking', 'svc-laundry', 'svc-dishes'] },
  { id: 'exp-4', name: 'Sunita Reddy',  city: 'Hyderabad', phone: '9876500004', avatar: PORTRAIT(52), bio: 'All-round household help. 8 years of trusted service.',            experience_years: 8, avg_rating: 4.7, review_count: 421, total_jobs: 1620, status: 'OFFLINE', services: ['svc-cleaning', 'svc-bathroom', 'svc-laundry', 'svc-kitchen'] },
];

// Demo customer
const customer = { id: 'cust-demo', name: 'Aarti Customer', email: 'customer@snabbit.test', city: 'Bengaluru', phone: '9999900000', avatar: PORTRAIT(90) };

async function upsertProfileAccount({ id, email, name, city, phone, avatar }, role, passwordHash) {
  await query(
    'INSERT INTO users (id, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE email = VALUES(email)',
    [id, email, passwordHash],
  );
  await query(
    `INSERT INTO profiles (id, name, phone, city, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), city = VALUES(city), avatar_url = VALUES(avatar_url)`,
    [id, name ?? null, phone ?? null, city ?? null, avatar ?? null],
  );
  await query(
    'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)',
    [id, id, role],
  );
}

async function run() {
  console.log('Seeding Snabbit demo data…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Services
  for (const s of services) {
    await query(
      `INSERT INTO services (id, name, slug, tagline, description, icon_name, image_url, rate_per_hour, min_hours, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), description = VALUES(description),
         icon_name = VALUES(icon_name), image_url = VALUES(image_url), rate_per_hour = VALUES(rate_per_hour), min_hours = VALUES(min_hours), sort_order = VALUES(sort_order)`,
      [s.id, s.name, s.slug, s.tagline, s.description, s.icon_name, s.image_url, s.rate_per_hour, s.min_hours, s.sort_order],
    );
  }
  console.log(`  ${services.length} services`);

  // Experts (each with a login account)
  for (const e of experts) {
    await upsertProfileAccount({ id: e.id, email: `${e.id}@snabbit.test`, name: e.name, city: e.city, phone: e.phone, avatar: e.avatar }, 'EXPERT', passwordHash);
    await query(
      `INSERT INTO experts (id, gender, bio, experience_years, avg_rating, review_count, total_jobs, is_verified, is_trained, status, onboarding_status, service_pincodes, created_at)
       VALUES (?, 'FEMALE', ?, ?, ?, ?, ?, 1, 1, ?, 'APPROVED', JSON_ARRAY(), NOW())
       ON DUPLICATE KEY UPDATE bio = VALUES(bio), experience_years = VALUES(experience_years), avg_rating = VALUES(avg_rating),
         review_count = VALUES(review_count), total_jobs = VALUES(total_jobs), is_verified = 1, is_trained = 1, status = VALUES(status)`,
      [e.id, e.bio, e.experience_years, e.avg_rating, e.review_count, e.total_jobs, e.status],
    );
    await query('INSERT INTO expert_wallet (expert_id, available_balance, pending_balance, total_earned) VALUES (?, 0, 0, 0) ON DUPLICATE KEY UPDATE expert_id = expert_id', [e.id]);
    await query('DELETE FROM expert_services WHERE expert_id = ?', [e.id]);
    for (const svc of e.services) {
      await query('INSERT INTO expert_services (expert_id, service_id) VALUES (?, ?)', [e.id, svc]);
    }
  }
  console.log(`  ${experts.length} experts`);

  // Demo customer
  await upsertProfileAccount(customer, 'CUSTOMER', passwordHash);
  await query(
    `INSERT INTO addresses (id, customer_id, label, flat, address_line, city, pincode, is_default, created_at)
     VALUES ('addr-demo', ?, 'Home', '12B, Lake View Apartments', 'Indiranagar, 100ft Road', 'Bengaluru', '560038', 1, NOW())
     ON DUPLICATE KEY UPDATE address_line = VALUES(address_line)`,
    [customer.id],
  );
  console.log('  1 demo customer + address');

  // Demo wallet balance for the customer
  await query(
    `INSERT INTO customer_wallet (user_id, balance, total_added) VALUES (?, 1000, 1000)
     ON DUPLICATE KEY UPDATE balance = VALUES(balance), total_added = VALUES(total_added)`,
    [customer.id],
  );

  // Demo coupons
  const coupons = [
    { id: 'cpn-welcome', code: 'WELCOME50', type: 'FLAT', value: 50, max_uses: 1000 },
    { id: 'cpn-save20', code: 'SAVE20', type: 'PERCENT', value: 20, max_uses: 500 },
  ];
  for (const c of coupons) {
    await query(
      `INSERT INTO coupons (id, code, type, value, used_count, max_uses, is_active, created_at)
       VALUES (?, ?, ?, ?, 0, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE type = VALUES(type), value = VALUES(value), max_uses = VALUES(max_uses), is_active = 1`,
      [c.id, c.code, c.type, c.value, c.max_uses],
    );
  }
  console.log(`  ₹1000 wallet + ${coupons.length} coupons (WELCOME50, SAVE20)`);

  // ── CMS / platform config (persistent tables) ──────────────────────────────
  const cities = [
    { id: 'city-blr', name: 'Bengaluru', state: 'Karnataka' },
    { id: 'city-mum', name: 'Mumbai', state: 'Maharashtra' },
    { id: 'city-del', name: 'Delhi', state: 'Delhi' },
    { id: 'city-hyd', name: 'Hyderabad', state: 'Telangana' },
    { id: 'city-pune', name: 'Pune', state: 'Maharashtra' },
  ];
  for (const c of cities) {
    await query(
      `INSERT INTO cities (id, name, state, is_active, created_at) VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), state = VALUES(state)`,
      [c.id, c.name, c.state],
    );
  }

  const settings = [
    { key: 'platform_name', value: 'HomeHero', is_public: 1 },
    { key: 'support_email', value: 'help@homehero.test', is_public: 1 },
    { key: 'support_phone', value: '1800-200-2000', is_public: 1 },
    { key: 'platform_fee_pct', value: '15', is_public: 0 },
    { key: 'dispatch_radius_km', value: '15', is_public: 0 },
  ];
  for (const s of settings) {
    await query(
      `INSERT INTO settings (setting_key, setting_value, is_public, updated_at) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public)`,
      [s.key, s.value, s.is_public],
    );
  }

  const banners = [
    { id: 'ban-1', title: 'Sparkling homes, every day', image_url: IMG('photo-1581578731548-c64695cc6952'), sort: 1 },
    { id: 'ban-2', title: 'Trained experts in minutes', image_url: IMG('photo-1556911220-bff31c812dba'), sort: 2 },
  ];
  for (const b of banners) {
    await query(
      `INSERT INTO banners (id, title, image_url, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), image_url = VALUES(image_url), sort_order = VALUES(sort_order)`,
      [b.id, b.title, b.image_url, b.sort],
    );
  }

  const pages = [
    { slug: 'terms', title: 'Terms of Service', body: 'These are the demo terms of service for HomeHero.' },
    { slug: 'privacy', title: 'Privacy Policy', body: 'This is the demo privacy policy for HomeHero.' },
  ];
  for (const p of pages) {
    await query(
      `INSERT INTO cms_pages (slug, title, body, updated_at) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body)`,
      [p.slug, p.title, p.body],
    );
  }
  console.log(`  ${cities.length} cities, ${settings.length} settings, ${banners.length} banners, ${pages.length} CMS pages`);

  // Super-admin demo account
  await upsertProfileAccount({ id: 'superadmin-demo', email: 'superadmin@homehero.test', name: 'Super Admin', city: 'Bengaluru' }, 'SUPER_ADMIN', passwordHash);
  console.log('  1 super-admin (superadmin@homehero.test)');

  console.log('\nSeed complete. Demo logins (password: ' + DEMO_PASSWORD + '):');
  console.log('  Customer: ' + customer.email);
  experts.forEach((e) => console.log('  Expert:   ' + e.id + '@snabbit.test (' + e.name + ')'));
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); });
