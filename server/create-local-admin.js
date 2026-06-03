import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
];
for (const p of envPaths) dotenv.config({ path: p });

const adminEmail = process.env.ADMIN_EMAIL || 'admin@homehero.test';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

async function run() {
  const existing = await query('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length > 0) {
    const id = existing[0].id;
    await query('INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)', [id, id, 'ADMIN']);
    console.log('Admin user already exists. Role ensured to ADMIN:', adminEmail);
    console.log(`Admin credentials: ${adminEmail} / (your existing password)`);
    return;
  }

  const id = `admin-${crypto.randomUUID()}`;
  const hash = await bcrypt.hash(adminPassword, 10);
  await query('INSERT INTO users (id, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, 1, NOW())', [id, adminEmail, hash]);
  await query('INSERT INTO profiles (id, name, city, created_at) VALUES (?, ?, NULL, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name)', [id, 'Admin']);
  await query('INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role)', [id, id, 'ADMIN']);

  console.log(`Local admin created: ${adminEmail} / ${adminPassword}`);
  console.log('Keep these credentials safe. You can change the password later via the API or DB.');
}

run().catch((e) => {
  console.error('Failed to create local admin:', e);
  process.exit(1);
});
