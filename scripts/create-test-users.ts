import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('Creating test users and groups...');

  // Create groups
  const adminGroup = await prisma.group.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' }
  });

  const editorGroup = await prisma.group.upsert({
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor' }
  });

  const viewerGroup = await prisma.group.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer' }
  });

  const publicGroup = await prisma.group.upsert({
    where: { name: 'public' },
    update: {},
    create: { name: 'public' }
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      password: adminPassword,
    }
  });

  // Assign admin to admin group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: adminUser.id,
        groupId: adminGroup.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      groupId: adminGroup.id,
      isPrimary: true
    }
  });

  // Create editor user
  const editorPassword = await bcrypt.hash('editor123', 12);
  const editorUser = await prisma.user.upsert({
    where: { username: 'editor' },
    update: {},
    create: {
      username: 'editor',
      name: 'Editor User',
      email: 'editor@example.com',
      password: editorPassword,
    }
  });

  // Assign editor to editor group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: editorUser.id,
        groupId: editorGroup.id
      }
    },
    update: {},
    create: {
      userId: editorUser.id,
      groupId: editorGroup.id,
      isPrimary: true
    }
  });

  // Create viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 12);
  const viewerUser = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      name: 'Viewer User',
      email: 'viewer@example.com',
      password: viewerPassword,
    }
  });

  // Assign viewer to viewer group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: viewerUser.id,
        groupId: viewerGroup.id
      }
    },
    update: {},
    create: {
      userId: viewerUser.id,
      groupId: viewerGroup.id,
      isPrimary: true
    }
  });

  console.log('Test users created:');
  console.log('Admin: username="admin", password="admin123"');
  console.log('Editor: username="editor", password="editor123"');
  console.log('Viewer: username="viewer", password="viewer123"');
}

createTestUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
