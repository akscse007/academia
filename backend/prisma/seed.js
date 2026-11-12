import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { ensureBootstrap } from '../src/utils/bootstrap.js';

process.env.AUTO_SEED = 'true';
(async () => {
  await ensureBootstrap();
  console.log('\nSeed complete. Sample accounts:');
  console.log(`  Platform owner : ${process.env.PLATFORM_OWNER_EMAIL || 'owner@yourplatform.com'} / ${process.env.PLATFORM_OWNER_PASSWORD || 'Owner@12345'}`);
  console.log('  Teacher        : teacher@brightfuture.test / Teacher@123  (slug: bright-future-academy)');
  console.log('  Student        : student@brightfuture.test / Student@123');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
