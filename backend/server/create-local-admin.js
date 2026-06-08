import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const envPaths = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), 'server', '.env')];
for (const p of envPaths) dotenv.config({ path: p });

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL || 'admin@homehero.test';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

async function run() {
  const existing = await prisma.users.findUnique({ where: { email: adminEmail }, select: { id: true } });
  if (existing) {
    await prisma.user_roles.upsert({ where: { id: existing.id }, create: { id: existing.id, user_id: existing.id, role: 'ADMIN' }, update: { role: 'ADMIN' } });
    console.log('Admin user already exists. Role ensured to ADMIN:', adminEmail);
    return;
  }

  const id = `admin-${crypto.randomUUID()}`;
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.users.create({ data: { id, email: adminEmail, password_hash: hash, is_verified: true } });
  await prisma.profiles.upsert({ where: { id }, create: { id, name: 'Admin', city: null }, update: { name: 'Admin' } });
  await prisma.user_roles.upsert({ where: { id }, create: { id, user_id: id, role: 'ADMIN' }, update: { role: 'ADMIN' } });
  console.log(`Local admin created: ${adminEmail} / ${adminPassword}`);
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error('Failed to create local admin:', e); process.exit(1); });
