import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.update({
    where: { setting_key: 'global_theme_background' },
    data: { setting_value: '#fbfbff' } // Approximation of oklch(0.99 0.004 300)
  });
  await prisma.settings.update({
    where: { setting_key: 'global_theme_glass_bg' },
    data: { setting_value: '#ffffff' }
  });
  console.log('Successfully converted colors to HEX');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
