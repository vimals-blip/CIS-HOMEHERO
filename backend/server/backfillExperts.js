import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const missing = await prisma.$queryRaw`
    SELECT ur.user_id, p.name
    FROM user_roles ur
    LEFT JOIN profiles p ON p.id = ur.user_id
    LEFT JOIN experts e ON e.id = ur.user_id
    WHERE ur.role = 'EXPERT' AND e.id IS NULL
  `;

  if (missing.length === 0) {
    console.log('All EXPERT-role users already have an experts row. Nothing to do.');
    return;
  }

  console.log(`Backfilling ${missing.length} expert(s):`);
  for (const m of missing) console.log(`  - ${m.user_id} (${m.name ?? 'unknown'})`);

  for (const m of missing) {
    await prisma.experts.create({
      data: { id: m.user_id, gender: 'FEMALE', bio: null, experience_years: 0, is_verified: false, is_trained: false, status: 'OFFLINE', service_pincodes: [], onboarding_status: 'SUBMITTED' },
    });
    await prisma.expert_wallet.upsert({
      where: { expert_id: m.user_id },
      create: { expert_id: m.user_id },
      update: {},
    });
  }

  const remaining = await prisma.$queryRaw`
    SELECT COUNT(*) AS c FROM user_roles ur LEFT JOIN experts e ON e.id = ur.user_id WHERE ur.role = 'EXPERT' AND e.id IS NULL
  `;
  console.log(`Done. Orphaned experts remaining: ${Number(remaining[0].c)}.`);
  console.log('Note: backfilled experts are unverified — approve them in the admin KYC queue.');
}

run()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch((e) => { console.error('Backfill failed:', e); process.exit(1); });
