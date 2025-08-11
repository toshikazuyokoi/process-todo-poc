// Test entity mapping
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMapping() {
  console.log('=== Testing Entity Mapping ===\n');
  
  // Get ProcessTemplate with StepTemplates from DB
  const dbData = await prisma.processTemplate.findUnique({
    where: { id: 1 },
    include: {
      stepTemplates: true,
    },
  });
  
  console.log('Raw DB Data for Process Template 1:');
  console.log('Process:', dbData.name);
  console.log('\nStep Templates:');
  
  dbData.stepTemplates.forEach(step => {
    console.log(`  ID ${step.id}: ${step.name}`);
    console.log(`    basis: ${step.basis}`);
    console.log(`    offsetDays: ${step.offsetDays} (type: ${typeof step.offsetDays})`);
    console.log(`    dependsOnJson: ${JSON.stringify(step.dependsOnJson)}`);
  });
  
  // Now test the repository mapping
  console.log('\n=== Testing Repository Mapping ===');
  
  // Simulate what ProcessTemplateRepository.toDomainWithSteps does
  const { ProcessTemplate } = require('./dist/domain/entities/process-template');
  const { StepTemplate } = require('./dist/domain/entities/step-template');
  
  const processTemplate = new ProcessTemplate(
    dbData.id,
    dbData.name,
    dbData.version,
    dbData.isActive,
    dbData.createdAt,
    dbData.updatedAt,
  );
  
  const stepTemplates = dbData.stepTemplates.map(step => {
    console.log(`\nMapping step ${step.id}:`);
    console.log(`  Input offsetDays: ${step.offsetDays}`);
    
    const st = new StepTemplate(
      step.id,
      step.processId,
      step.seq,
      step.name,
      step.basis,
      step.offsetDays,
      step.requiredArtifactsJson,
      step.dependsOnJson,
      step.createdAt,
      step.updatedAt,
    );
    
    console.log(`  Created StepTemplate, offset.getDays(): ${st.getOffset().getDays()}`);
    return st;
  });
  
  processTemplate.setStepTemplates(stepTemplates);
  
  console.log('\n=== Final Check ===');
  processTemplate.getStepTemplates().forEach(st => {
    console.log(`Step ${st.getId()}: ${st.getName()}`);
    console.log(`  Offset days: ${st.getOffset().getDays()}`);
  });
  
  await prisma.$disconnect();
}

testMapping().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});