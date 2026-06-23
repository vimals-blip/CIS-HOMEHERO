import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { setting_key: 'global_gemini_api_key' },
    update: {},
    create: {
      setting_key: 'global_gemini_api_key',
      setting_value: '',
      is_public: false,
    },
  });
  console.log('Gemini API Key setting seeded into CMS.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
