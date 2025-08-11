import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.stepInstance.deleteMany();
  await prisma.case.deleteMany();
  await prisma.stepTemplate.deleteMany();
  await prisma.processTemplate.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: '管理者',
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'tanaka@example.com',
      name: '田中太郎',
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'suzuki@example.com',
      name: '鈴木花子',
      role: 'USER',
    },
  });

  console.log('Created users');

  // Create Japanese holidays for 2025
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

  console.log('Created Japanese holidays for 2025');

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
  
  // Update dependencies with actual IDs
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

  console.log('Created sales process template');

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
  
  // Update dependencies with actual IDs
  const recruitDependencies = [
    { seq: 2, deps: [1] },
    { seq: 3, deps: [2] },
    { seq: 4, deps: [3] },
    { seq: 5, deps: [4] },
    { seq: 6, deps: [5] },
    { seq: 7, deps: [6] },
    { seq: 8, deps: [7] },
    { seq: 9, deps: [8] },
  ];
  
  for (const dep of recruitDependencies) {
    const stepId = recruitStepIds.get(dep.seq);
    const depIds = dep.deps.map(seq => recruitStepIds.get(seq)!).filter(id => id !== undefined);
    if (stepId && depIds.length > 0) {
      await prisma.stepTemplate.update({
        where: { id: stepId },
        data: { dependsOnJson: depIds },
      });
    }
  }

  console.log('Created recruitment process template');

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

  const onboardStepIds: Map<number, number> = new Map();
  for (const step of onboardSteps) {
    const created = await prisma.stepTemplate.create({
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
    onboardStepIds.set(step.seq, created.id);
  }
  
  // Update dependencies with actual IDs
  const onboardDependencies = [
    { seq: 3, deps: [1, 2] },
    { seq: 4, deps: [3] },
    { seq: 5, deps: [3] },
    { seq: 6, deps: [4, 5] },
    { seq: 7, deps: [6] },
  ];
  
  for (const dep of onboardDependencies) {
    const stepId = onboardStepIds.get(dep.seq);
    const depIds = dep.deps.map(seq => onboardStepIds.get(seq)!).filter(id => id !== undefined);
    if (stepId && depIds.length > 0) {
      await prisma.stepTemplate.update({
        where: { id: stepId },
        data: { dependsOnJson: depIds },
      });
    }
  }

  console.log('Created onboarding process template');

  // Create sample cases
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

  console.log('Created sample cases');

  // Create step instances for the first case
  const salesTemplateSteps = await prisma.stepTemplate.findMany({
    where: { processId: salesTemplate.id },
    orderBy: { seq: 'asc' },
  });

  const today = new Date();
  const goalDate = new Date('2025-03-31');
  
  for (const template of salesTemplateSteps) {
    let dueDate: Date;
    if (template.basis === 'goal') {
      dueDate = new Date(goalDate);
      dueDate.setDate(dueDate.getDate() + template.offsetDays);
    } else {
      // For simplicity, calculate based on sequence
      dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + template.seq * 3);
    }

    await prisma.stepInstance.create({
      data: {
        caseId: sampleCase1.id,
        templateId: template.id,
        name: template.name,
        dueDateUtc: dueDate,
        status: template.seq === 1 ? 'IN_PROGRESS' : 'TODO',
        locked: false,
      },
    });
  }

  console.log('Created step instances for sample case');

  console.log('Seed completed successfully!');
  console.log({
    users: 3,
    holidays: holidays2025.length,
    processTemplates: 3,
    sampleCases: 3,
  });
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });