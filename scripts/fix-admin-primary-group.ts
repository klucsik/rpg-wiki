import { prisma } from '../src/db';

async function fixAdminPrimaryGroup() {
  try {
    // Find the admin user and admin group
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    const adminGroup = await prisma.group.findUnique({
      where: { name: 'admin' }
    });
    
    if (!adminUser || !adminGroup) {
      console.error('Admin user or admin group not found');
      return;
    }
    
    // Update the admin group membership to be primary
    await prisma.userGroup.updateMany({
      where: {
        userId: adminUser.id,
        groupId: adminGroup.id
      },
      data: {
        isPrimary: true
      }
    });
    
    console.log('✅ Admin user primary group updated successfully');
    
    // Verify the change
    const updated = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: { 
        userGroups: {
          include: {
            group: true
          }
        }
      },
    });
    
    console.log('Updated admin user groups:', updated?.userGroups.map(ug => ({
      groupName: ug.group.name,
      isPrimary: ug.isPrimary
    })));
    
  } catch (error) {
    console.error('Error fixing admin primary group:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPrimaryGroup();
