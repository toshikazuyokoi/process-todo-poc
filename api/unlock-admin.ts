import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function unlockAdmin() {
  // adminユーザーの情報を確認
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });
  
  console.log('Admin user status:', {
    id: admin?.id,
    email: admin?.email,
    failedLoginAttempts: admin?.failedLoginAttempts,
    lockedUntil: admin?.lockedUntil,
    emailVerified: admin?.emailVerified
  });
  
  if (admin) {
    // ロックアウトをリセット
    const updated = await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
    console.log('Admin user unlocked successfully');
    console.log('Updated admin:', {
      email: updated.email,
      failedLoginAttempts: updated.failedLoginAttempts,
      lockedUntil: updated.lockedUntil
    });
  }
}

unlockAdmin().catch(console.error).finally(() => prisma.$disconnect());
