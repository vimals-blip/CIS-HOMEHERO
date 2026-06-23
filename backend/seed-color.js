import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { setting_key: 'global_primary_color' },
    update: { 
      setting_value: '#8b5cf6', // Violet
      is_public: true 
    },
    create: {
      setting_key: 'global_primary_color',
      setting_value: '#8b5cf6',
      is_public: true,
    },
  });
  console.log('Successfully force-updated global_primary_color');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
