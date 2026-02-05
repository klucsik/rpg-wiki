import { PrismaClient } from '../../../src/generated/prisma';
import bcrypt from 'bcryptjs';

// Use test database URL
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/rpg_wiki_test';

/**
 * Create a Prisma client for test database
 */
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Reset the test database - truncate all tables
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  console.log('🗑️  Resetting test database...');
  
  // Delete in order to respect foreign key constraints
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.userGroup.deleteMany(),
    prisma.user.deleteMany(),
    prisma.group.deleteMany(),
    prisma.pageVersion.deleteMany(),
    prisma.page.deleteMany(),
  ]);
  
  console.log('✅ Database reset complete');
}

/**
 * Create a user with password credentials
 */
export async function createUserWithPassword(
  prisma: PrismaClient,
  data: {
    username: string;
    password: string;
    email?: string;
    name?: string;
  }
): Promise<string> {
  const hashedPassword = await hashPassword(data.password);
  
  const user = await prisma.user.create({
    data: {
      username: data.username,
      displayUsername: data.username,
      // Use @localhost.local to match the signin-username API expectation
      email: data.email || `${data.username.toLowerCase()}@localhost.local`,
      name: data.name || data.username,
      emailVerified: true,
    },
  });
  
  // Create credentials account - use 'credential' (without 's') to match better-auth
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
    },
  });
  
  return user.id;
}

/**
 * Assign a user to groups
 */
export async function assignUserToGroups(
  prisma: PrismaClient,
  userId: string,
  groupNames: readonly string[]
): Promise<void> {
  for (const groupName of groupNames) {
    // Find or create the group
    let group = await prisma.group.findUnique({
      where: { name: groupName },
    });
    
    if (!group) {
      group = await prisma.group.create({
        data: { name: groupName },
      });
    }
    
    // Create the user-group association
    await prisma.userGroup.create({
      data: {
        userId,
        groupId: group.id,
      },
    });
  }
}

/**
 * Create a test page
 */
export async function createTestPage(
  prisma: PrismaClient,
  data: {
    title: string;
    content: string;
    path: string;
    view_groups?: string[];
    edit_groups?: string[];
  }
): Promise<number> {
  const page = await prisma.page.create({
    data: {
      title: data.title,
      content: data.content,
      path: data.path,
      view_groups: data.view_groups || ['public'],
      edit_groups: data.edit_groups || ['admin'],
    },
  });
  
  return page.id;
}
