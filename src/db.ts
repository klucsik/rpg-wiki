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
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor' },
  });
  
  await prisma.group.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer' },
  });
  
  await prisma.group.upsert({
    where: { name: 'public' },
    update: {},
    create: { name: 'public' },
  });

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!existingAdmin) {
    console.log('Creating default admin user...');
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewNcCNhCT/Jfh.Eu', // "admin123"
      },
    });

    // Assign admin to admin group
    await prisma.userGroup.create({
      data: {
        userId: adminUser.id,
        groupId: adminGroup.id,
      }
    });
  }
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
