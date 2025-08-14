import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAuth() {
  console.log('Seeding authentication data...');

  // Create default roles
  const roles = [
    { name: 'super_admin', description: 'Super Administrator with all permissions', isSystem: true },
    { name: 'org_admin', description: 'Organization Administrator', isSystem: true },
    { name: 'team_manager', description: 'Team Manager', isSystem: true },
    { name: 'project_owner', description: 'Project Owner', isSystem: true },
    { name: 'editor', description: 'Editor with write permissions', isSystem: true },
    { name: 'viewer', description: 'Viewer with read-only permissions', isSystem: true },
    { name: 'member', description: 'Default member role', isSystem: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // Create default permissions
  const resources = ['users', 'teams', 'templates', 'cases', 'steps', 'artifacts', 'comments'];
  const actions = ['create', 'read', 'update', 'delete'];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource,
            action,
          },
        },
        update: {},
        create: {
          resource,
          action,
          description: `${action} ${resource}`,
        },
      });
    }
  }

  // Assign permissions to roles
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  const allPermissions = await prisma.permission.findMany();

  if (superAdminRole) {
    // Give super admin all permissions
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Create editor role permissions
  const editorRole = await prisma.role.findUnique({ where: { name: 'editor' } });
  const editorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { action: 'read' },
        { action: 'create' },
        { action: 'update' },
      ],
    },
  });

  if (editorRole) {
    for (const permission of editorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: editorRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: editorRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Create viewer role permissions
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  const viewerPermissions = await prisma.permission.findMany({
    where: { action: 'read' },
  });

  if (viewerRole) {
    for (const permission of viewerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Create a default organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'default-org' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default-org',
      plan: 'free',
    },
  });

  // Create a default team
  const team = await prisma.team.upsert({
    where: { id: 1 }, // Assuming first team
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Default Team',
      description: 'Default team for all users',
    },
  });

  // Create test users with proper passwords
  const password = await bcrypt.hash('password123', 10);
  
  const testUsers = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password,
      role: 'super_admin',
      emailVerified: true,
    },
    {
      email: 'editor@example.com',
      name: 'Editor User',
      password,
      role: 'editor',
      emailVerified: true,
    },
    {
      email: 'viewer@example.com',
      name: 'Viewer User',
      password,
      role: 'viewer',
      emailVerified: true,
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: userData.password,
        emailVerified: userData.emailVerified,
      },
      create: userData,
    });

    // Add user to team
    await prisma.teamMember.upsert({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: team.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        teamId: team.id,
      },
    });

    // Assign role to user
    const role = await prisma.role.findUnique({ where: { name: userData.role } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId_teamId: {
            userId: user.id,
            roleId: role.id,
            teamId: team.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
          teamId: team.id,
        },
      });
    }
  }

  console.log('Authentication data seeded successfully!');
  console.log('Test users created:');
  console.log('  - admin@example.com / password123 (Super Admin)');
  console.log('  - editor@example.com / password123 (Editor)');
  console.log('  - viewer@example.com / password123 (Viewer)');
}

seedAuth()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });