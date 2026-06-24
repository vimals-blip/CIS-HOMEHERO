import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.settings.upsert({
    where: { setting_key: 'global_groq_api_key' },
    update: {},
    create: {
      setting_key: 'global_groq_api_key',
      setting_value: '',
      is_public: false,
    }
  });
  console.log('Database updated successfully for Groq');
}
run().catch(console.error).finally(() => prisma.$disconnect());
