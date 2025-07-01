const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔄 Updating admin password...');
    console.log('New hash:', hashedPassword);
    
    await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Admin password updated successfully!');
    
    // Test the new password
    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    const isValid = await bcrypt.compare(newPassword, user.password);
    console.log('✅ Password test:', isValid ? 'VALID' : 'INVALID');
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
