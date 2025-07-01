const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: {
        userGroups: {
          include: {
            group: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Name:', user.name);
    console.log('- Email:', user.email);
    console.log('- Groups:', user.userGroups.map(ug => ug.group.name));
    
    // Test the password
    const testPassword = 'admin123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    console.log('- Password "admin123" valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password does not match!');
      console.log('- Stored hash:', user.password);
      
      // Let's try to create a new hash for comparison
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('- Expected new hash:', newHash);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
