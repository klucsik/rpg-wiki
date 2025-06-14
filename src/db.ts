import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

// On cold start, test DB connection and fail fast if not available
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await prisma.$connect();
      // Optionally, check a table exists (throws if not migrated)
      await prisma.page.findFirst();
      console.log('Database connection established and schema is up to date.');
    } catch (err) {
      console.error('Database connection or schema check failed at startup:', err);
      if (typeof process.exit === 'function') process.exit(1);
      throw err;
    }
  })();
}

export { prisma };
