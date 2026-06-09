import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';
const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=70`;

const services = [
  { id: 'svc-cleaning',  name: 'Home Cleaning',     slug: 'home-cleaning',    tagline: 'Sweeping, mopping & dusting',  icon_name: 'Sparkles',   rate_per_hour: 199, min_hours: 1, sort_order: 1, description: 'Sweeping, mopping, dusting and tidying up your home.',                   image_url: IMG('photo-1581578731548-c64695cc6952') },
  { id: 'svc-dishes',    name: 'Dishwashing',        slug: 'dishwashing',      tagline: 'Sparkling clean utensils',     icon_name: 'Utensils',   rate_per_hour: 169, min_hours: 1, sort_order: 2, description: 'A trained expert washes, dries and stacks all your utensils.',          image_url: IMG('photo-1556910103-1c02745aae4d') },
  { id: 'svc-kitchen',   name: 'Kitchen Cleaning',   slug: 'kitchen-cleaning', tagline: 'Counters, stove & sink',       icon_name: 'CookingPot', rate_per_hour: 229, min_hours: 1, sort_order: 3, description: 'Deep clean of counters, stove, sink and kitchen surfaces.',             image_url: IMG('photo-1556911220-bff31c812dba') },
  { id: 'svc-bathroom',  name: 'Bathroom Cleaning',  slug: 'bathroom-cleaning',tagline: 'Spotless & sanitised',         icon_name: 'ShowerHead', rate_per_hour: 249, min_hours: 1, sort_order: 4, description: 'Scrubbing and sanitising of toilets, tiles and fittings.',              image_url: IMG('photo-1584622650111-993a426fbf0a') },
  { id: 'svc-laundry',   name: 'Laundry Help',       slug: 'laundry-help',     tagline: 'Wash, dry & fold',             icon_name: 'Shirt',      rate_per_hour: 179, min_hours: 1, sort_order: 5, description: 'Washing, drying, folding and organising your laundry.',                image_url: IMG('photo-1545173168-9f1947eebb7f') },
  { id: 'svc-cooking',   name: 'Cooking Help',       slug: 'cooking-help',     tagline: 'Chopping, prep & cooking',     icon_name: 'ChefHat',    rate_per_hour: 269, min_hours: 1, sort_order: 6, description: 'Vegetable chopping, dough kneading and basic meal prep.',              image_url: IMG('photo-1556909212-d5b604d0c90d') },
];

const PORTRAIT  = (n) => `https://randomuser.me/api/portraits/women/${n}.jpg`;
const MPORTRAIT = (n) => `https://randomuser.me/api/portraits/men/${n}.jpg`;

const experts = [
  { id: 'exp-1', name: 'Lakshmi Nair',    city: 'Bengaluru', phone: '9876500001', avatar: PORTRAIT(68),  gender: 'FEMALE', bio: 'Cleaning & dishwashing specialist with 6 years of experience.', experience_years: 6, avg_rating: 4.9, review_count: 312, total_jobs: 1240, status: 'ONLINE',  services: ['svc-cleaning', 'svc-dishes', 'svc-kitchen'] },
  { id: 'exp-2', name: 'Priya Sharma',    city: 'Bengaluru', phone: '9876500002', avatar: PORTRAIT(65),  gender: 'FEMALE', bio: 'Expert in kitchen and bathroom deep cleaning. Friendly and thorough.', experience_years: 4, avg_rating: 4.8, review_count: 198, total_jobs: 760,  status: 'ONLINE',  services: ['svc-kitchen', 'svc-bathroom', 'svc-cleaning'] },
  { id: 'exp-3', name: 'Anjali Verma',    city: 'Mumbai',    phone: '9876500003', avatar: PORTRAIT(44),  gender: 'FEMALE', bio: 'Loves cooking help and laundry. Punctual and warm.',              experience_years: 5, avg_rating: 4.9, review_count: 256, total_jobs: 980,  status: 'ONLINE',  services: ['svc-cooking', 'svc-laundry', 'svc-dishes'] },
  { id: 'exp-4', name: 'Sunita Reddy',    city: 'Hyderabad', phone: '9876500004', avatar: PORTRAIT(52),  gender: 'FEMALE', bio: 'All-round household help. 8 years of trusted service.',            experience_years: 8, avg_rating: 4.7, review_count: 421, total_jobs: 1620, status: 'OFFLINE', services: ['svc-cleaning', 'svc-bathroom', 'svc-laundry', 'svc-kitchen'] },
  { id: 'exp-5', name: 'Abhishek Kumar', city: 'Bengaluru', phone: '9876500005', avatar: MPORTRAIT(32), gender: 'MALE',   bio: 'Multi-service expert for cooking, cleaning and laundry. 3 years experience.', experience_years: 3, avg_rating: 4.6, review_count: 87, total_jobs: 310, status: 'ONLINE',  services: ['svc-cooking', 'svc-cleaning', 'svc-laundry'] },
];

const customer = { id: 'cust-demo', name: 'Aarti Customer', email: 'customer@snabbit.test', city: 'Bengaluru', phone: '9999900000', avatar: PORTRAIT(90) };

async function upsertAccount({ id, email, name, city, phone, avatar }, role, passwordHash) {
  // Remove any conflicting user that has the same email but a different id
  const conflict = await prisma.users.findFirst({ where: { email, NOT: { id } } });
  if (conflict) {
    await prisma.user_roles.deleteMany({ where: { user_id: conflict.id } });
    await prisma.profiles.deleteMany({ where: { id: conflict.id } });
    await prisma.users.delete({ where: { id: conflict.id } });
  }
  await prisma.users.upsert({
    where: { id },
    create: { id, email, password_hash: passwordHash, is_verified: true },
    update: { email },
  });
  await prisma.profiles.upsert({
    where: { id },
    create: { id, name: name ?? null, phone: phone ?? null, city: city ?? null, avatar_url: avatar ?? null },
    update: { name: name ?? null, phone: phone ?? null, city: city ?? null, avatar_url: avatar ?? null },
  });
  await prisma.user_roles.upsert({
    where: { id },
    create: { id, user_id: id, role },
    update: { role },
  });
}

async function run() {
  console.log('Seeding demo data…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const s of services) {
    await prisma.services.upsert({
      where: { id: s.id },
      create: { ...s, is_active: true },
      update: { name: s.name, tagline: s.tagline, description: s.description, icon_name: s.icon_name, image_url: s.image_url, rate_per_hour: s.rate_per_hour, min_hours: s.min_hours, sort_order: s.sort_order },
    });
  }
  console.log(`  ${services.length} services`);

  for (const e of experts) {
    await upsertAccount({ id: e.id, email: `${e.id}@snabbit.test`, name: e.name, city: e.city, phone: e.phone, avatar: e.avatar }, 'EXPERT', passwordHash);
    await prisma.experts.upsert({
      where: { id: e.id },
      create: { id: e.id, gender: e.gender ?? 'FEMALE', bio: e.bio, experience_years: e.experience_years, avg_rating: e.avg_rating, review_count: e.review_count, total_jobs: e.total_jobs, is_verified: true, is_trained: true, status: e.status, onboarding_status: 'APPROVED', service_pincodes: [] },
      update: { bio: e.bio, experience_years: e.experience_years, avg_rating: e.avg_rating, review_count: e.review_count, total_jobs: e.total_jobs, is_verified: true, is_trained: true, status: e.status },
    });
    await prisma.expert_wallet.upsert({ where: { expert_id: e.id }, create: { expert_id: e.id }, update: {} });
    await prisma.expert_services.deleteMany({ where: { expert_id: e.id } });
    await prisma.expert_services.createMany({ data: e.services.map((svc) => ({ expert_id: e.id, service_id: svc })) });
  }
  console.log(`  ${experts.length} experts`);

  await upsertAccount(customer, 'CUSTOMER', passwordHash);
  await prisma.addresses.upsert({
    where: { id: 'addr-demo' },
    create: { id: 'addr-demo', customer_id: customer.id, label: 'Home', flat: '12B, Lake View Apartments', address_line: 'Indiranagar, 100ft Road', city: 'Bengaluru', pincode: '560038', is_default: true },
    update: { address_line: 'Indiranagar, 100ft Road' },
  });
  await prisma.customer_wallet.upsert({ where: { user_id: customer.id }, create: { user_id: customer.id, balance: 1000, total_added: 1000 }, update: { balance: 1000, total_added: 1000 } });
  console.log('  1 demo customer + address + ₹1000 wallet');

  const coupons = [
    { id: 'cpn-welcome', code: 'WELCOME50', type: 'FLAT',    value: 50, max_uses: 1000 },
    { id: 'cpn-save20',  code: 'SAVE20',    type: 'PERCENT', value: 20, max_uses: 500 },
  ];
  for (const c of coupons) {
    await prisma.coupons.upsert({ where: { id: c.id }, create: { ...c, used_count: 0, is_active: true }, update: { type: c.type, value: c.value, max_uses: c.max_uses, is_active: true } });
  }
  console.log(`  ${coupons.length} coupons`);

  const cities = [
    { id: 'city-blr',  name: 'Bengaluru', state: 'Karnataka' },
    { id: 'city-mum',  name: 'Mumbai',    state: 'Maharashtra' },
    { id: 'city-del',  name: 'Delhi',     state: 'Delhi' },
    { id: 'city-hyd',  name: 'Hyderabad', state: 'Telangana' },
    { id: 'city-pune', name: 'Pune',      state: 'Maharashtra' },
  ];
  for (const c of cities) {
    await prisma.cities.upsert({ where: { id: c.id }, create: { ...c, is_active: true }, update: { name: c.name, state: c.state } });
  }

  const settingsList = [
    { setting_key: 'platform_name',    setting_value: 'HomeHero',          is_public: true },
    { setting_key: 'support_email',    setting_value: 'help@homehero.test', is_public: true },
    { setting_key: 'support_phone',    setting_value: '1800-200-2000',      is_public: true },
    { setting_key: 'platform_fee_pct', setting_value: '15',                 is_public: false },
    { setting_key: 'dispatch_radius_km', setting_value: '15',               is_public: false },
  ];
  for (const s of settingsList) {
    await prisma.settings.upsert({ where: { setting_key: s.setting_key }, create: s, update: { setting_value: s.setting_value, is_public: s.is_public } });
  }

  const banners = [
    { id: 'ban-1', title: 'Sparkling homes, every day',    image_url: IMG('photo-1581578731548-c64695cc6952'), sort_order: 1, is_active: true },
    { id: 'ban-2', title: 'Trained experts in minutes',    image_url: IMG('photo-1556911220-bff31c812dba'),    sort_order: 2, is_active: true },
  ];
  for (const b of banners) {
    await prisma.banners.upsert({ where: { id: b.id }, create: b, update: { title: b.title, image_url: b.image_url, sort_order: b.sort_order } });
  }

  const pages = [
    { slug: 'terms',   title: 'Terms of Service', body: 'These are the demo terms of service for HomeHero.' },
    { slug: 'privacy', title: 'Privacy Policy',   body: 'This is the demo privacy policy for HomeHero.' },
  ];
  for (const p of pages) {
    await prisma.cms_pages.upsert({ where: { slug: p.slug }, create: p, update: { title: p.title, body: p.body } });
  }
  console.log(`  ${cities.length} cities, ${settingsList.length} settings, ${banners.length} banners, ${pages.length} CMS pages`);

  await upsertAccount({ id: 'superadmin-demo', email: 'superadmin@homehero.test', name: 'Super Admin', city: 'Bengaluru' }, 'SUPER_ADMIN', passwordHash);
  await upsertAccount({ id: 'admin-demo', email: 'admin@homehero.test', name: 'Admin User', city: 'Bengaluru' }, 'ADMIN', passwordHash);
  console.log('  1 super-admin (superadmin@homehero.test)');
  console.log('  1 admin      (admin@homehero.test)');

  console.log('\nSeed complete. Demo password: ' + DEMO_PASSWORD);
  console.log('  Super Admin: superadmin@homehero.test');
  console.log('  Admin:       admin@homehero.test');
  console.log('  Customer:    ' + customer.email);
  experts.forEach((e) => console.log('  Expert:   ' + e.id + '@snabbit.test (' + e.name + ')'));
}

run()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); });
