import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

let seeded = false;

async function seedDefaults() {
  if (seeded) return;
  seeded = true;
  // Seed default groups if not present
  const adminGroup = await prisma.group.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  await prisma.group.upsert({
    where: { name: 'public' },
    update: {},
    create: { name: 'public' },
  });
  // Seed default admin user if not present
  await prisma.user.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      password: 'admin',
      groups: { connect: [{ id: adminGroup.id }] },
    },
  });
}

// Only connect and seed if running in a real server environment (not build)
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'test' &&
  process.env.PRISMA_SKIP_DB_INIT !== '1'
) {
  (async () => {
    try {
      await prisma.$connect();
      // Optionally, check a table exists (throws if not migrated)
      await prisma.page.findFirst();
      await seedDefaults();
      console.log('Database connection established, schema is up to date, and default groups are seeded.');
    } catch (err) {
      console.error('Database connection or schema check failed at startup:', err);
      if (typeof process.exit === 'function') process.exit(1);
      throw err;
    }
  })();
}

export { prisma };
