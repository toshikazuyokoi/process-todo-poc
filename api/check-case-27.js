// Check what's in the database for case 27
const { PrismaClient } = require('@prisma/client');

async function checkCase27() {
  const prisma = new PrismaClient();
  
  try {
    const steps = await prisma.stepInstance.findMany({
      where: { caseId: 27 },
      orderBy: { templateId: 'asc' }
    });
    
    console.log('Steps for case 27:');
    steps.forEach(step => {
      const date = new Date(step.dueDateUtc);
      console.log(`${step.templateId}: ${step.name}`);
      console.log(`  Database value: ${step.dueDateUtc}`);
      console.log(`  As ISO: ${date.toISOString()}`);
      console.log(`  Year: ${date.getFullYear()}`);
      if (date.getFullYear() < 2000) {
        console.log('  ❌ 1970 date!');
      }
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

checkCase27().catch(console.error);