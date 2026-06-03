import { query } from './db.js';

const categories = [
  { id: 'cat-cleaning', name: 'Home Cleaning', base_price: 2500, commission_pct: 15, is_active: 1 },
  { id: 'cat-plumbing', name: 'Plumbing', base_price: 1800, commission_pct: 12, is_active: 1 },
  { id: 'cat-electrical', name: 'Electrical', base_price: 2000, commission_pct: 12, is_active: 1 },
];

const profiles = [
  { id: 'user-1', name: 'Alice Johnson', city: 'Mumbai' },
  { id: 'user-2', name: 'Ravi Patel', city: 'Pune' },
];

const providers = [
  { id: 'user-2', avg_rating: 4.8, bio: 'Experienced home services technician.', experience_years: 6, hourly_rate: 350, is_verified: 1, pin_codes: JSON.stringify(['400001','411001']), review_count: 42, status: 'ONLINE' },
];

console.log('Seeding sample data...');
for (const category of categories) {
  await query(
    `INSERT INTO categories (id, name, base_price, commission_pct, is_active)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), base_price = VALUES(base_price), commission_pct = VALUES(commission_pct), is_active = VALUES(is_active)`,
    [category.id, category.name, category.base_price, category.commission_pct, category.is_active],
  );
}

for (const profile of profiles) {
  await query(
    `INSERT INTO profiles (id, name, city)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city)`,
    [profile.id, profile.name, profile.city],
  );
}

for (const provider of providers) {
  await query(
    `INSERT INTO providers (id, avg_rating, bio, experience_years, hourly_rate, is_verified, pin_codes, review_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE avg_rating = VALUES(avg_rating), bio = VALUES(bio), experience_years = VALUES(experience_years), hourly_rate = VALUES(hourly_rate), is_verified = VALUES(is_verified), pin_codes = VALUES(pin_codes), review_count = VALUES(review_count), status = VALUES(status)`,
    [provider.id, provider.avg_rating, provider.bio, provider.experience_years, provider.hourly_rate, provider.is_verified, provider.pin_codes, provider.review_count, provider.status],
  );
}

console.log('Seed complete.');
