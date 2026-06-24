import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const settings = await prisma.settings.findMany();
  console.log(settings.map(s => s.setting_key));
}
run().catch(console.error).finally(() => prisma.$disconnect());
