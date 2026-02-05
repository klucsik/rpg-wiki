import { createTestPrismaClient, createTestPage as createTestPageWithPrisma } from './prisma-helpers';

// Shared prisma client for test helpers
let prismaClient: ReturnType<typeof createTestPrismaClient> | null = null;

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = createTestPrismaClient();
  }
  return prismaClient;
}

/**
 * Create a test page with a simplified interface (no prisma client needed)
 * This is for use in step definitions where we don't have access to prisma directly
 */
export async function createTestPage(data: {
  title: string;
  content: string;
  path: string;
  view_groups?: string[];
  edit_groups?: string[];
}): Promise<{ id: number; title: string }> {
  const prisma = getPrismaClient();
  const id = await createTestPageWithPrisma(prisma, data);
  return { id, title: data.title };
}

/**
 * Clean up the prisma client connection
 * Call this at the end of test suite
 */
export async function cleanupTestHelpers(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
