#!/usr/bin/env tsx

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function migrateBranchSetting() {
  console.log('Checking for existing git_branch_name setting...');
  
  const existing = await prisma.siteSetting.findUnique({
    where: { key: 'git_branch_name' }
  });

  if (!existing) {
    console.log('Creating default git_branch_name setting...');
    await prisma.siteSetting.create({
      data: {
        key: 'git_branch_name',
        value: 'main',
        encrypted: false
      }
    });
    console.log('✅ Default git_branch_name setting created');
  } else {
    console.log('✅ git_branch_name setting already exists');
  }
}

migrateBranchSetting()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
