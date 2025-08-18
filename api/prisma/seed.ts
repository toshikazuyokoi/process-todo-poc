import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting unified seed...');

  // ========================================
  // 1. Clean up existing data
  // ========================================
  console.log('Cleaning up existing data...');
  
  // Delete in correct order to avoid foreign key constraints
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.stepInstance.deleteMany();
  await prisma.case.deleteMany();
  await prisma.stepTemplate.deleteMany();
  await prisma.processTemplate.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  // ========================================
  // 2. Setup Authentication (Roles & Permissions)
  // ========================================
  console.log('Setting up roles and permissions...');

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
  const editorRole = await prisma.role.findUnique({ where: { name: 'editor' } });
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  const allPermissions = await prisma.permission.findMany();

  // Super admin gets all permissions
  if (superAdminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Editor gets read, create, update permissions
  if (editorRole) {
    const editorPermissions = await prisma.permission.findMany({
      where: {
        OR: [
          { action: 'read' },
          { action: 'create' },
          { action: 'update' },
        ],
      },
    });
    for (const permission of editorPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: editorRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Viewer gets read permissions only
  if (viewerRole) {
    const viewerPermissions = await prisma.permission.findMany({
      where: { action: 'read' },
    });
    for (const permission of viewerPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // ========================================
  // 3. Create Organization and Team
  // ========================================
  console.log('Creating organization and team...');

  const organization = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default-org',
      plan: 'free',
    },
  });

  const team = await prisma.team.create({
    data: {
      organizationId: organization.id,
      name: 'Default Team',
      description: 'Default team for all users',
    },
  });

  // ========================================
  // 4. Create Users
  // ========================================
  console.log('Creating users...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: '管理者',
      password: adminPassword,
      role: 'ADMIN', // Legacy role field
      emailVerified: true,
    },
  });

  // Create regular users
  const user1 = await prisma.user.create({
    data: {
      email: 'tanaka@example.com',
      name: '田中太郎',
      password: userPassword,
      role: 'USER', // Legacy role field
      emailVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'suzuki@example.com',
      name: '鈴木花子',
      password: userPassword,
      role: 'USER', // Legacy role field
      emailVerified: true,
    },
  });

  // Additional test users for different roles
  const editorUser = await prisma.user.create({
    data: {
      email: 'editor@example.com',
      name: 'Editor User',
      password: userPassword,
      role: 'USER', // Legacy role field
      emailVerified: true,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@example.com',
      name: 'Viewer User',
      password: userPassword,
      role: 'USER', // Legacy role field
      emailVerified: true,
    },
  });

  // Add all users to the team
  const allUsers = [adminUser, user1, user2, editorUser, viewerUser];
  for (const user of allUsers) {
    await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: team.id,
      },
    });
  }

  // Assign RBAC roles to users
  if (superAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        teamId: team.id,
      },
    });
  }

  if (editorRole) {
    await prisma.userRole.create({
      data: {
        userId: editorUser.id,
        roleId: editorRole.id,
        teamId: team.id,
      },
    });
    await prisma.userRole.create({
      data: {
        userId: user1.id,
        roleId: editorRole.id,
        teamId: team.id,
      },
    });
  }

  if (viewerRole) {
    await prisma.userRole.create({
      data: {
        userId: viewerUser.id,
        roleId: viewerRole.id,
        teamId: team.id,
      },
    });
    await prisma.userRole.create({
      data: {
        userId: user2.id,
        roleId: viewerRole.id,
        teamId: team.id,
      },
    });
  }

  console.log('Users created:');
  console.log('  - admin@example.com / admin123 (Super Admin)');
  console.log('  - tanaka@example.com / password123 (Editor)');
  console.log('  - suzuki@example.com / password123 (Viewer)');
  console.log('  - editor@example.com / password123 (Editor)');
  console.log('  - viewer@example.com / password123 (Viewer)');

  // ========================================
  // 5. Create Japanese Holidays
  // ========================================
  console.log('Creating Japanese holidays for 2025...');

  const holidays2025 = [
    { date: new Date('2025-01-01'), name: '元日', countryCode: 'JP' },
    { date: new Date('2025-01-13'), name: '成人の日', countryCode: 'JP' },
    { date: new Date('2025-02-11'), name: '建国記念の日', countryCode: 'JP' },
    { date: new Date('2025-02-23'), name: '天皇誕生日', countryCode: 'JP' },
    { date: new Date('2025-02-24'), name: '振替休日', countryCode: 'JP' },
    { date: new Date('2025-03-20'), name: '春分の日', countryCode: 'JP' },
    { date: new Date('2025-04-29'), name: '昭和の日', countryCode: 'JP' },
    { date: new Date('2025-05-03'), name: '憲法記念日', countryCode: 'JP' },
    { date: new Date('2025-05-04'), name: 'みどりの日', countryCode: 'JP' },
    { date: new Date('2025-05-05'), name: 'こどもの日', countryCode: 'JP' },
    { date: new Date('2025-05-06'), name: '振替休日', countryCode: 'JP' },
    { date: new Date('2025-07-21'), name: '海の日', countryCode: 'JP' },
    { date: new Date('2025-08-11'), name: '山の日', countryCode: 'JP' },
    { date: new Date('2025-09-15'), name: '敬老の日', countryCode: 'JP' },
    { date: new Date('2025-09-23'), name: '秋分の日', countryCode: 'JP' },
    { date: new Date('2025-10-13'), name: 'スポーツの日', countryCode: 'JP' },
    { date: new Date('2025-11-03'), name: '文化の日', countryCode: 'JP' },
    { date: new Date('2025-11-23'), name: '勤労感謝の日', countryCode: 'JP' },
    { date: new Date('2025-11-24'), name: '振替休日', countryCode: 'JP' },
  ];

  await prisma.holiday.createMany({
    data: holidays2025,
  });

  // ========================================
  // 6. Create Process Templates
  // ========================================
  console.log('Creating process templates...');

  // Process Template 1: 営業案件プロセス
  const salesTemplate = await prisma.processTemplate.create({
    data: {
      name: '営業案件プロセス',
      version: 1,
      isActive: true,
    },
  });

  // Sales process steps with dependencies
  const salesSteps = [
    { seq: 1, name: 'リード獲得', basis: 'goal', offsetDays: -30, deps: [] },
    { seq: 2, name: '初回コンタクト', basis: 'prev', offsetDays: 2, deps: [] },
    { seq: 3, name: 'ヒアリング面談', basis: 'prev', offsetDays: 3, deps: [] },
    { seq: 4, name: '提案書作成', basis: 'prev', offsetDays: 5, deps: [] },
    { seq: 5, name: '見積作成', basis: 'prev', offsetDays: 2, deps: [] },
    { seq: 6, name: '提案プレゼン', basis: 'prev', offsetDays: 1, deps: [] },
    { seq: 7, name: '条件交渉', basis: 'prev', offsetDays: 5, deps: [] },
    { seq: 8, name: '契約締結', basis: 'prev', offsetDays: 2, deps: [] },
    { seq: 9, name: 'キックオフ', basis: 'goal', offsetDays: 0, deps: [] },
  ];

  const salesStepIds: Map<number, number> = new Map();
  for (const step of salesSteps) {
    const created = await prisma.stepTemplate.create({
      data: {
        processId: salesTemplate.id,
        seq: step.seq,
        name: step.name,
        basis: step.basis,
        offsetDays: step.offsetDays,
        dependsOnJson: [],
        requiredArtifactsJson: [],
      },
    });
    salesStepIds.set(step.seq, created.id);
  }
  
  // Update dependencies
  const salesDependencies = [
    { seq: 2, deps: [1] },
    { seq: 3, deps: [2] },
    { seq: 4, deps: [3] },
    { seq: 5, deps: [3] },
    { seq: 6, deps: [4, 5] },
    { seq: 7, deps: [6] },
    { seq: 8, deps: [7] },
    { seq: 9, deps: [8] },
  ];
  
  for (const dep of salesDependencies) {
    const stepId = salesStepIds.get(dep.seq);
    const depIds = dep.deps.map(seq => salesStepIds.get(seq)!).filter(id => id !== undefined);
    if (stepId && depIds.length > 0) {
      await prisma.stepTemplate.update({
        where: { id: stepId },
        data: { dependsOnJson: depIds },
      });
    }
  }

  // Process Template 2: 採用プロセス
  const recruitmentTemplate = await prisma.processTemplate.create({
    data: {
      name: '採用プロセス',
      version: 1,
      isActive: true,
    },
  });

  // Recruitment process steps
  const recruitSteps = [
    { seq: 1, name: '求人票作成', basis: 'goal', offsetDays: -45, deps: [] },
    { seq: 2, name: '求人掲載', basis: 'prev', offsetDays: 1, deps: [] },
    { seq: 3, name: '応募受付期間', basis: 'prev', offsetDays: 14, deps: [] },
    { seq: 4, name: '書類選考', basis: 'prev', offsetDays: 5, deps: [] },
    { seq: 5, name: '一次面接', basis: 'prev', offsetDays: 7, deps: [] },
    { seq: 6, name: '二次面接', basis: 'prev', offsetDays: 7, deps: [] },
    { seq: 7, name: '最終面接', basis: 'prev', offsetDays: 5, deps: [] },
    { seq: 8, name: '内定通知', basis: 'prev', offsetDays: 2, deps: [] },
    { seq: 9, name: '入社手続き', basis: 'goal', offsetDays: 0, deps: [] },
  ];

  const recruitStepIds: Map<number, number> = new Map();
  for (const step of recruitSteps) {
    const created = await prisma.stepTemplate.create({
      data: {
        processId: recruitmentTemplate.id,
        seq: step.seq,
        name: step.name,
        basis: step.basis,
        offsetDays: step.offsetDays,
        dependsOnJson: [],
        requiredArtifactsJson: [],
      },
    });
    recruitStepIds.set(step.seq, created.id);
  }

  // Process Template 3: オンボーディングプロセス
  const onboardingTemplate = await prisma.processTemplate.create({
    data: {
      name: 'オンボーディングプロセス',
      version: 1,
      isActive: true,
    },
  });

  // Onboarding process steps
  const onboardSteps = [
    { seq: 1, name: 'アカウント発行', basis: 'goal', offsetDays: -30, deps: [] },
    { seq: 2, name: 'PC・備品準備', basis: 'goal', offsetDays: -30, deps: [] },
    { seq: 3, name: '入社初日オリエンテーション', basis: 'goal', offsetDays: -30, deps: [] },
    { seq: 4, name: 'システム研修', basis: 'prev', offsetDays: 2, deps: [] },
    { seq: 5, name: '部門紹介', basis: 'prev', offsetDays: 1, deps: [] },
    { seq: 6, name: 'OJT開始', basis: 'prev', offsetDays: 20, deps: [] },
    { seq: 7, name: '1ヶ月面談', basis: 'goal', offsetDays: 0, deps: [] },
  ];

  for (const step of onboardSteps) {
    await prisma.stepTemplate.create({
      data: {
        processId: onboardingTemplate.id,
        seq: step.seq,
        name: step.name,
        basis: step.basis,
        offsetDays: step.offsetDays,
        dependsOnJson: [],
        requiredArtifactsJson: [],
      },
    });
  }

  // ========================================
  // 7. Create Sample Cases
  // ========================================
  console.log('Creating sample cases...');

  const sampleCase1 = await prisma.case.create({
    data: {
      processId: salesTemplate.id,
      title: '株式会社ABC商事 - システム導入案件',
      goalDateUtc: new Date('2025-03-31'),
      status: 'OPEN',
      createdBy: user1.id,
    },
  });

  const sampleCase2 = await prisma.case.create({
    data: {
      processId: recruitmentTemplate.id,
      title: 'エンジニア採用 - シニアポジション',
      goalDateUtc: new Date('2025-04-30'),
      status: 'OPEN',
      createdBy: user2.id,
    },
  });

  const sampleCase3 = await prisma.case.create({
    data: {
      processId: onboardingTemplate.id,
      title: '新入社員オンボーディング - 山田さん',
      goalDateUtc: new Date('2025-02-01'),
      status: 'OPEN',
      createdBy: adminUser.id,
    },
  });

  // Create step instances for all sample cases
  const allCases = [
    { case: sampleCase1, goalDate: new Date('2025-03-31') },
    { case: sampleCase2, goalDate: new Date('2025-04-30') },
    { case: sampleCase3, goalDate: new Date('2025-02-01') },
  ];

  const today = new Date();
  
  for (const caseInfo of allCases) {
    const templateSteps = await prisma.stepTemplate.findMany({
      where: { processId: caseInfo.case.processId },
      orderBy: { seq: 'asc' },
    });

    for (const template of templateSteps) {
      let dueDate: Date;
      let startDate: Date;
      
      if (template.basis === 'goal') {
        dueDate = new Date(caseInfo.goalDate);
        dueDate.setDate(dueDate.getDate() + template.offsetDays);
        // Set start date as 7 days before due date
        startDate = new Date(dueDate);
        startDate.setDate(startDate.getDate() - 7);
      } else {
        // For simplicity, calculate based on sequence
        dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + template.seq * 3);
        startDate = new Date(dueDate);
        startDate.setDate(startDate.getDate() - 7);
      }

      await prisma.stepInstance.create({
        data: {
          caseId: caseInfo.case.id,
          templateId: template.id,
          name: template.name,
          dueDateUtc: dueDate,
          startDateUtc: startDate,
          status: template.seq === 1 ? 'IN_PROGRESS' : 'TODO',
          locked: false,
        },
      });
    }
  }

  // ========================================
  // 8. Summary
  // ========================================
  console.log('\n===========================================');
  console.log('Unified seed completed successfully!');
  console.log('===========================================');
  console.log('\nCreated:');
  console.log(`  - ${roles.length} roles`);
  console.log(`  - ${resources.length * actions.length} permissions`);
  console.log(`  - 1 organization`);
  console.log(`  - 1 team`);
  console.log(`  - 5 users`);
  console.log(`  - ${holidays2025.length} holidays`);
  console.log(`  - 3 process templates`);
  console.log(`  - 3 sample cases`);
  console.log(`  - 25 step instances (9 + 9 + 7)`);
  console.log('\nLogin credentials:');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  Users: password123');
  console.log('===========================================\n');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });