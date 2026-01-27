/**
 * One-time migration script to normalize all emails to @localhost.local format
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-emails.ts
 * Or: npx tsx scripts/normalize-emails.ts
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function normalizeEmails() {
  console.log('Starting email normalization migration...\n');

  // Find all users with emails that don't end in @localhost.local
  const usersToNormalize = await prisma.user.findMany({
    where: {
      email: {
        not: {
          endsWith: '@localhost.local',
        },
      },
    },
  });

  if (usersToNormalize.length === 0) {
    console.log('✅ All emails are already normalized to @localhost.local');
    return;
  }

  console.log(`Found ${usersToNormalize.length} user(s) with non-normalized emails:\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const user of usersToNormalize) {
    // Determine username: use existing username, or extract from email, or use id
    let username = user.username;

    if (!username && user.email) {
      username = user.email.split('@')[0].toLowerCase();
    }

    if (!username) {
      username = user.id.substring(0, 8);
    }

    // Sanitize username
    const sanitizedUsername = username.replace(/[^a-z0-9._-]/g, '').toLowerCase();
    const normalizedEmail = `${sanitizedUsername}@localhost.local`;

    // Check for email collision
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== user.id) {
      console.log(`⚠️  SKIP: ${user.email} -> ${normalizedEmail} (collision with user ${existingUser.id})`);
      skipCount++;
      continue;
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedEmail,
        username: user.username || sanitizedUsername,
        emailVerified: true,
      },
    });

    console.log(`✅ ${user.email} -> ${normalizedEmail}`);
    successCount++;
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Normalized: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
}

normalizeEmails()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
