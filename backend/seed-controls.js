import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = [
    { key: 'global_glass_opacity', value: '80' },
    { key: 'global_bg_blur', value: '4' }
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { setting_key: s.key },
      update: { 
        is_public: true 
      },
      create: {
        setting_key: s.key,
        setting_value: s.value,
        is_public: true,
      },
    });
  }
  
  console.log('Successfully seeded glass and blur controls');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
