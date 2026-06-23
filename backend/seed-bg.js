import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { setting_key: 'global_background_image_url' },
    update: { 
      setting_value: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
      is_public: true 
    },
    create: {
      setting_key: 'global_background_image_url',
      setting_value: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
      is_public: true,
    },
  });
  console.log('Successfully force-updated global_background_image_url');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
