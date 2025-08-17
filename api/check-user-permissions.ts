import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserPermissions() {
  console.log('=== Checking User Permissions ===\n');

  // 1. ユーザーの確認
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  console.log('Users in database:');
  users.forEach(u => console.log(`  - ${u.email} (id: ${u.id})`));

  // 2. ロールの確認
  const roles = await prisma.role.findMany();
  console.log('\nRoles in database:');
  roles.forEach(r => console.log(`  - ${r.name} (id: ${r.id})`));

  // 3. パーミッションの確認（templates関連）
  const permissions = await prisma.permission.findMany({
    where: { resource: 'templates' }
  });
  console.log('\nTemplate permissions:');
  permissions.forEach(p => console.log(`  - ${p.resource}:${p.action} (id: ${p.id})`));

  // 4. チームの確認
  const teams = await prisma.team.findMany();
  console.log('\nTeams in database:');
  teams.forEach(t => console.log(`  - ${t.name} (id: ${t.id})`));

  // 5. ユーザーロールの確認
  const userRoles = await prisma.userRole.findMany({
    include: {
      user: true,
      role: true,
      team: true
    }
  });
  console.log('\nUser Roles:');
  userRoles.forEach(ur => 
    console.log(`  - User: ${ur.user.email}, Role: ${ur.role.name}, Team: ${ur.team ? ur.team.name : 'N/A'}`)
  );

  // 6. ロールパーミッションの確認
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      role: true,
      permission: true
    },
    where: {
      permission: {
        resource: 'templates'
      }
    }
  });
  console.log('\nRole Permissions for templates:');
  rolePermissions.forEach(rp => 
    console.log(`  - Role: ${rp.role.name} has ${rp.permission.resource}:${rp.permission.action}`)
  );

  // 7. 特定ユーザー（tanaka）の権限詳細
  const tanaka = await prisma.user.findFirst({
    where: { email: 'tanaka@example.com' },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          },
          team: true
        }
      }
    }
  });

  if (tanaka) {
    console.log('\n=== Tanaka User Permissions Detail ===');
    console.log(`User: ${tanaka.email}`);
    if (tanaka.userRoles.length === 0) {
      console.log('  No roles assigned!');
    } else {
      tanaka.userRoles.forEach(ur => {
        console.log(`  Role: ${ur.role.name} in Team: ${ur.team ? ur.team.name : 'N/A'}`);
        console.log('    Permissions:');
        ur.role.rolePermissions.forEach(rp => {
          console.log(`      - ${rp.permission.resource}:${rp.permission.action}`);
        });
      });
    }
  }
}

checkUserPermissions()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });