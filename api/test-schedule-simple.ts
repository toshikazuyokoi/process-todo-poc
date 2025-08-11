import { PrismaClient } from '@prisma/client';

async function testSchedule() {
  const prisma = new PrismaClient();
  
  try {
    // Get onboarding template (ID 20)
    const template = await prisma.processTemplate.findUnique({
      where: { id: 20 },
      include: {
        stepTemplates: true
      }
    });
    
    if (!template) {
      console.log('Template not found');
      return;
    }
    
    console.log(`Template: ${template.name}`);
    console.log(`Steps: ${template.stepTemplates.length}`);
    console.log('\nStep templates:');
    
    for (const step of template.stepTemplates) {
      console.log(`  ${step.seq}. ${step.name}`);
      console.log(`     Basis: ${step.basis}, Offset: ${step.offsetDays}`);
      console.log(`     Dependencies: ${JSON.stringify(step.dependsOnJson)}`);
    }
    
    // Check the last created case
    const lastCase = await prisma.case.findUnique({
      where: { id: 38 },
      include: {
        stepInstances: {
          orderBy: { templateId: 'asc' }
        }
      }
    });
    
    if (lastCase) {
      console.log(`\nCase ${lastCase.id}: ${lastCase.title}`);
      console.log(`Goal: ${lastCase.goalDateUtc}`);
      console.log('\nStep instances:');
      
      for (const step of lastCase.stepInstances) {
        const year = step.dueDateUtc?.getFullYear();
        const flag = year && year < 2000 ? ' ❌ ERROR: 1970!' : '';
        console.log(`  ${step.name}: ${step.dueDateUtc} (Year: ${year})${flag}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchedule();