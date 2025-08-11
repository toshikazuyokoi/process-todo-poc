import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check1970Dates() {
  console.log('Checking for 1970 dates in database...\n');
  
  // Check all step instances with 1970 dates
  const problemSteps = await prisma.stepInstance.findMany({
    where: {
      dueDateUtc: {
        lt: new Date('2000-01-01')
      }
    },
    include: {
      case: true
    }
  });
  
  console.log(`Found ${problemSteps.length} step instances with dates before 2000:\n`);
  
  for (const step of problemSteps) {
    console.log(`Step ID: ${step.id}`);
    console.log(`  Name: ${step.name}`);
    console.log(`  Case: ${step.case.title} (ID: ${step.caseId})`);
    console.log(`  Due Date: ${step.dueDateUtc}`);
    console.log(`  Year: ${step.dueDateUtc?.getFullYear()}\n`);
  }
  
  // Fix case 37 specifically
  if (problemSteps.some(s => s.caseId === 37)) {
    console.log('Fixing case 37 dates...');
    
    const case37 = await prisma.case.findUnique({
      where: { id: 37 }
    });
    
    if (case37) {
      const goalDate = case37.goalDateUtc;
      console.log(`Case 37 goal date: ${goalDate}`);
      
      const case37Steps = await prisma.stepInstance.findMany({
        where: { caseId: 37 }
      });
      
      // Update all 1970 dates to reasonable defaults
      for (const step of case37Steps) {
        if (step.dueDateUtc && step.dueDateUtc.getFullYear() < 2000) {
          // Set to 30 days before goal date as default
          const newDate = new Date(goalDate);
          newDate.setDate(newDate.getDate() - 30);
          
          await prisma.stepInstance.update({
            where: { id: step.id },
            data: { dueDateUtc: newDate }
          });
          
          console.log(`  Updated step ${step.name} to ${newDate}`);
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

check1970Dates().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});