import { PrismaClient } from '../../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Use global to persist across module reloads in dev mode
declare global {
  var __seedingComplete: boolean | undefined;
}

/**
 * Seeds default data - runs once per server lifetime
 * Ensures admin user always has working credentials from ADMIN_PASSWORD env var
 */
async function seedDefaults() {
  // Only seed once per server instance
  if (global.__seedingComplete) {
    return;
  }

  // Mark as in progress immediately to prevent concurrent runs
  global.__seedingComplete = true;
  
  // Wait 10 seconds for better-auth APIs to be available
  console.log('[DB] Waiting 10 seconds for server startup...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('[DB] Starting database seeding...');
  
  try {
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

    // Ensure admin user exists with password from environment variable
    await ensureAdminUser(adminGroup.id);
    
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
async function ensureAdminUser(adminGroupId: string) {
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
async function createAdminViaBetterAuth(baseUrl: string, email: string, password: string, adminGroupId: string) {
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
