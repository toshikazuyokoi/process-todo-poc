import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplatesOnly() {
  console.log('Starting template seed...');

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

  console.log('Template seed completed successfully!');
  console.log('Created 3 process templates with steps');
}

seedTemplatesOnly()
  .catch((e) => {
    console.error('Error during template seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
