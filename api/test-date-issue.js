// Test to find where dates become 1970
const { PrismaClient } = require('@prisma/client');
const { ProcessTemplateRepository } = require('./dist/infrastructure/repositories/process-template.repository');
const { HolidayRepository } = require('./dist/infrastructure/repositories/holiday.repository');
const { BusinessDayService } = require('./dist/domain/services/business-day.service');
const { ReplanDomainService } = require('./dist/domain/services/replan-domain.service');
const { StepInstance } = require('./dist/domain/entities/step-instance');
const { StepStatus } = require('./dist/domain/values/step-status');
const { PrismaService } = require('./dist/infrastructure/prisma/prisma.service');

async function testDateIssue() {
  console.log('=== Testing Date Issue ===\n');
  
  const prismaService = new PrismaService();
  await prismaService.$connect();
  
  const processTemplateRepo = new ProcessTemplateRepository(prismaService);
  const holidayRepo = new HolidayRepository(prismaService);
  const businessDayService = new BusinessDayService(holidayRepo);
  const replanService = new ReplanDomainService(businessDayService);
  
  // Get process template
  const processTemplate = await processTemplateRepo.findWithStepTemplates(1);
  const goalDate = new Date('2025-12-31');
  
  // Calculate schedule
  console.log('Step 1: Calculate schedule');
  const schedulePlan = await replanService.calculateScheduleV2(
    processTemplate,
    goalDate,
  );
  
  console.log('Calculated dates:');
  schedulePlan.steps.forEach(step => {
    console.log(`  ${step.name}: ${step.dueDateUtc.toISOString()} (Year: ${step.dueDateUtc.getFullYear()})`);
  });
  
  // Create StepInstance entities
  console.log('\nStep 2: Create StepInstance entities');
  const stepInstances = schedulePlan.steps.map(step => {
    const si = new StepInstance(
      null,
      23, // use existing case ID
      step.templateId,
      step.name,
      step.dueDateUtc, // Pass Date object directly
      null,
      'todo',
      false,
      new Date(),
      new Date(),
    );
    
    const dueDate = si.getDueDate();
    console.log(`  ${step.name}:`);
    console.log(`    Input date: ${step.dueDateUtc.toISOString()}`);
    console.log(`    StepInstance dueDate: ${dueDate ? dueDate.getDate().toISOString() : 'null'}`);
    
    return si;
  });
  
  // Prepare data for Prisma
  console.log('\nStep 3: Prepare data for Prisma');
  const dataToSave = stepInstances.map(si => {
    const dueDateValue = si.getDueDate()?.getDate() || null;
    console.log(`  ${si.getName()}:`);
    console.log(`    Date to save: ${dueDateValue ? dueDateValue.toISOString() : 'null'}`);
    if (dueDateValue) {
      console.log(`    Year: ${dueDateValue.getFullYear()}`);
      console.log(`    Type: ${typeof dueDateValue}`);
      console.log(`    Is Date?: ${dueDateValue instanceof Date}`);
    }
    
    return {
      caseId: 23,
      templateId: si.getTemplateId(),
      name: si.getName(),
      dueDateUtc: dueDateValue,
      assigneeId: null,
      status: 'todo',
      locked: false,
    };
  });
  
  // Test with a single insert
  console.log('\nStep 4: Test single insert with 初回コンタクト');
  const testStep = dataToSave.find(d => d.name === '初回コンタクト');
  if (testStep) {
    console.log('Data to insert:', JSON.stringify(testStep, null, 2));
    console.log('Date value type:', typeof testStep.dueDateUtc);
    console.log('Date value:', testStep.dueDateUtc);
    
    try {
      const result = await prismaService.stepInstance.create({
        data: testStep,
      });
      
      console.log('\nResult from database:');
      console.log('  ID:', result.id);
      console.log('  Name:', result.name);
      console.log('  Due Date UTC:', result.dueDateUtc);
      if (result.dueDateUtc) {
        const date = new Date(result.dueDateUtc);
        console.log('  Year:', date.getFullYear());
        if (date.getFullYear() < 2000) {
          console.error('  ❌ ERROR: Date is in 1970!');
        }
      }
      
      // Clean up
      await prismaService.stepInstance.delete({
        where: { id: result.id }
      });
      
    } catch (error) {
      console.error('Error inserting:', error);
    }
  }
  
  await prismaService.$disconnect();
}

testDateIssue().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});