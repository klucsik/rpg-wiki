import { PrismaClient } from '../../generated/prisma';
import bcrypt from 'bcryptjs';

// Singleton pattern — all imports share the SAME PrismaClient instance
// regardless of how Bun resolves the module path.
declare global {
  var __prisma__: PrismaClient | undefined;
  var __seedingComplete: boolean | undefined;
}

const prisma = globalThis.__prisma__ || new PrismaClient();
if (!globalThis.__prisma__) {
  globalThis.__prisma__ = prisma;
}

/**
 * Seeds default data - runs once on first connection.
 * Groups are upserted immediately; admin user creation uses a retry loop
 * because better-auth APIs may not be ready yet when Next.js is still compiling.
 */
async function seedDefaults() {
  // Only seed once per server instance
  if (global.__seedingComplete) {
    return;
  }

  // Mark as in progress immediately to prevent concurrent runs
  global.__seedingComplete = true;

  console.log('[DB] Starting database seeding...');

  try {
    // Seed default groups immediately (tables exist — migrations run before dev server)
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

    // Ensure admin user exists with password from environment variable.
    // better-auth APIs might not be ready yet, so retry a few times.
    let retries = 5;
    while (retries > 0) {
      try {
        await ensureAdminUser(adminGroup.id);
        break; // success
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.log(`[DB] Admin user creation failed, retrying in 2s... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('[DB] Database seeding complete');
  } catch (error) {
    console.error('[DB] Seeding failed:', error);
    // Don't reset flag - prevent retries
  }
}

/**
 * Ensures admin user exists with correct password from ADMIN_PASSWORD env var
 * Uses better-auth APIs to ensure password compatibility
 */
async function ensureAdminUser(adminGroupId: number) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmail = 'admin@localhost.local';
  const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Check if admin user exists
  let adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
    include: { 
      accounts: { 
        where: { providerId: 'credential' } 
      } 
    },
  });

  if (!adminUser) {
    // Create admin user via better-auth API
    console.log('[DB] Creating admin user via better-auth...');
    await createAdminViaBetterAuth(baseUrl, adminEmail, ADMIN_PASSWORD, adminGroupId);
    return;
  }

  if (adminUser.accounts.length === 0) {
    // Admin exists but has no credential account - recreate via better-auth
    console.log('[DB] Admin user exists without credential account, recreating...');
    await prisma.user.delete({ where: { id: adminUser.id } });
    await createAdminViaBetterAuth(baseUrl, adminEmail, ADMIN_PASSWORD, adminGroupId);
    return;
  }

  // Admin exists with credential account - just ensure group membership
  console.log('[DB] Admin user exists');
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: adminUser.id,
        groupId: adminGroupId,
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      groupId: adminGroupId,
    }
  });
}

/**
 * Creates admin user via better-auth sign-up API
 */
async function createAdminViaBetterAuth(baseUrl: string, email: string, password: string, adminGroupId: number) {
  const signUpResult = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': baseUrl,
    },
    body: JSON.stringify({
      email,
      password,
      name: 'Administrator',
    }),
  });

  if (!signUpResult.ok) {
    const error = await signUpResult.json();
    throw new Error(`Better-auth signup failed: ${error.message || signUpResult.statusText}`);
  }

  const userData = await signUpResult.json();
  
  // Update the user with username and verified email
  const createdAdmin = await prisma.user.update({
    where: { id: userData.user.id },
    data: { 
      username: 'admin',
      emailVerified: true,
    },
  });
  
  // Ensure admin is in admin group
  await prisma.userGroup.create({
    data: {
      userId: createdAdmin.id,
      groupId: adminGroupId,
    },
  });
  
  console.log('[DB] Admin user created successfully');
}

// Connect and seed on first server start (skip in test environments)
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'test'
) {
  (async () => {
    try {
      await prisma.$connect();
      await seedDefaults();
      console.log('Database connection established and default groups are seeded.');
    } catch (err) {
      console.error('Database connection or seeding failed at startup:', err);
      if (typeof process.exit === 'function') process.exit(1);
      throw err;
    }
  })();
}

export { prisma };
