import { 
  createTestPrismaClient, 
  resetDatabase, 
  createUserWithPassword, 
  assignUserToGroups 
} from './prisma-helpers';
import { PERSONAS, ALL_GROUPS } from '../../fixtures/personas';

/**
 * Seed the test database with standard personas and groups
 */
export async function seedDatabase(): Promise<void> {
  const prisma = createTestPrismaClient();
  
  try {
    console.log('🌱 Seeding test database...');
    
    // Reset first
    await resetDatabase(prisma);
    
    // Create all groups
    console.log('📁 Creating groups...');
    for (const groupName of ALL_GROUPS) {
      await prisma.group.create({
        data: { name: groupName },
      });
    }
    console.log(`   Created ${ALL_GROUPS.length} groups`);
    
    // Create persona users
    console.log('👥 Creating persona users...');
    for (const [key, persona] of Object.entries(PERSONAS)) {
      const userId = await createUserWithPassword(prisma, {
        username: persona.username,
        password: persona.password,
        name: persona.name,
      });
      
      await assignUserToGroups(prisma, userId, persona.groups);
      console.log(`   Created user: ${persona.username} with groups: ${persona.groups.join(', ')}`);
    }
    
    console.log('✅ Database seeding complete');
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Quick reset - just truncate tables without full seed
 */
export async function quickReset(): Promise<void> {
  const prisma = createTestPrismaClient();
  
  try {
    await resetDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed script failed:', error);
      process.exit(1);
    });
}
