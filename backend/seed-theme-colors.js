import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = [
    { key: 'global_theme_background', value: 'oklch(0.99 0.004 300)' },
    { key: 'global_theme_glass_bg', value: '255, 255, 255' }
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
  
  console.log('Successfully seeded theme background controls');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
