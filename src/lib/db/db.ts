import { PrismaClient } from '../../generated/prisma';
import bcrypt from 'bcryptjs';

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

  // Create or update admin user with password from environment variable
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      // Always update password to match environment variable
      password: hashedPassword,
    },
    create: {
      username: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      password: hashedPassword,
    },
  });

  // Ensure admin is assigned to admin group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: adminUser.id,
        groupId: adminGroup.id,
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      groupId: adminGroup.id,
    }
  });

  console.log('Admin user synced with environment password');
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
