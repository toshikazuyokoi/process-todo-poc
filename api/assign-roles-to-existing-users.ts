import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignRolesToExistingUsers() {
  console.log('Assigning roles to existing users...');

  // Get the default team
  const team = await prisma.team.findFirst({
    where: { name: 'Default Team' }
  });

  if (!team) {
    throw new Error('Default Team not found. Please run seed-auth.ts first.');
  }

  // Get roles
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  const editorRole = await prisma.role.findUnique({ where: { name: 'editor' } });
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });

  if (!viewerRole || !editorRole || !superAdminRole) {
    throw new Error('Required roles not found. Please run seed-auth.ts first.');
  }

  // Assign roles to existing users
  const assignments = [
    { email: 'tanaka@example.com', role: viewerRole, roleName: 'viewer' },
    { email: 'suzuki@example.com', role: editorRole, roleName: 'editor' },
    { email: 'admin@example.com', role: superAdminRole, roleName: 'super_admin' }
  ];

  for (const assignment of assignments) {
    // Find the user
    const user = await prisma.user.findFirst({
      where: { email: assignment.email }
    });

    if (!user) {
      console.log(`User ${assignment.email} not found, skipping...`);
      continue;
    }

    // Check if user is already a team member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: team.id
        }
      }
    });

    // Add to team if not already a member
    if (!existingMember) {
      await prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: team.id
        }
      });
      console.log(`Added ${user.email} to Default Team`);
    }

    // Check if user already has a role in this team
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        teamId: team.id
      }
    });

    if (existingRole) {
      // Update existing role
      await prisma.userRole.update({
        where: {
          userId_roleId_teamId: {
            userId: user.id,
            roleId: existingRole.roleId,
            teamId: team.id
          }
        },
        data: {
          roleId: assignment.role.id
        }
      });
      console.log(`Updated ${user.email} role to ${assignment.roleName}`);
    } else {
      // Create new user role
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: assignment.role.id,
          teamId: team.id
        }
      });
      console.log(`Assigned ${assignment.roleName} role to ${user.email}`);
    }
  }

  console.log('\nRole assignment completed!');
  
  // Verify the assignments
  console.log('\nVerifying assignments:');
  for (const assignment of assignments) {
    const user = await prisma.user.findFirst({
      where: { email: assignment.email },
      include: {
        userRoles: {
          include: {
            role: true,
            team: true
          }
        }
      }
    });
    
    if (user && user.userRoles.length > 0) {
      console.log(`  ${user.email}: ${user.userRoles[0].role.name} in ${user.userRoles[0].team?.name || 'N/A'}`);
    }
  }
}

assignRolesToExistingUsers()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });