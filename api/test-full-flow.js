// Test full flow from repository to domain service
const { PrismaClient } = require('@prisma/client');
const { ProcessTemplateRepository } = require('./dist/infrastructure/repositories/process-template.repository');
const { HolidayRepository } = require('./dist/infrastructure/repositories/holiday.repository');
const { BusinessDayService } = require('./dist/domain/services/business-day.service');
const { ReplanDomainService } = require('./dist/domain/services/replan-domain.service');
const { PrismaService } = require('./dist/infrastructure/prisma/prisma.service');

async function testFullFlow() {
  console.log('=== Testing Full Flow ===\n');
  
  const prismaService = new PrismaService();
  await prismaService.$connect();
  
  const processTemplateRepo = new ProcessTemplateRepository(prismaService);
  const holidayRepo = new HolidayRepository(prismaService);
  const businessDayService = new BusinessDayService(holidayRepo);
  const replanService = new ReplanDomainService(businessDayService);
  
  // Step 1: Get process template
  console.log('Step 1: Getting process template...');
  const processTemplate = await processTemplateRepo.findWithStepTemplates(1);
  
  if (!processTemplate) {
    throw new Error('Process template not found');
  }
  
  console.log(`Found: ${processTemplate.getName()}`);
  console.log(`Step count: ${processTemplate.getStepTemplates().length}`);
  
  // Check step templates
  console.log('\nStep Templates:');
  processTemplate.getStepTemplates().forEach(st => {
    console.log(`  ${st.getId()}: ${st.getName()}`);
    console.log(`    Basis: ${st.getBasis().toString()}`);
    console.log(`    Offset: ${st.getOffset().getDays()} days`);
    console.log(`    Dependencies: ${JSON.stringify(st.getDependsOn())}`);
  });
  
  // Step 2: Test BusinessDayService directly
  console.log('\n=== Testing BusinessDayService ===');
  const testDate = new Date('2025-12-31');
  console.log('Test date:', testDate.toISOString());
  
  const add5 = await businessDayService.addBusinessDays(testDate, 5, 'JP');
  console.log('Add 5 days:', add5.toISOString(), 'Year:', add5.getFullYear());
  
  const subtract30 = await businessDayService.subtractBusinessDays(testDate, 30, 'JP');
  console.log('Subtract 30 days:', subtract30.toISOString(), 'Year:', subtract30.getFullYear());
  
  // Step 3: Test schedule calculation
  console.log('\n=== Testing Schedule Calculation (V2) ===');
  const goalDate = new Date('2025-12-31');
  console.log('Goal date:', goalDate.toISOString());
  
  try {
    const schedulePlan = await replanService.calculateScheduleV2(
      processTemplate,
      goalDate,
    );
    
    console.log('\nCalculated Schedule:');
    schedulePlan.steps.forEach(step => {
      const year = step.dueDateUtc.getFullYear();
      const is1970 = year < 2000;
      console.log(`  ${step.templateId}: ${step.name}`);
      console.log(`    Date: ${step.dueDateUtc.toISOString()}`);
      console.log(`    Year: ${year} ${is1970 ? '❌ ERROR: 1970!' : '✅'}`);
    });
    
    // Check for 1970 errors
    const errors1970 = schedulePlan.steps.filter(s => s.dueDateUtc.getFullYear() < 2000);
    if (errors1970.length > 0) {
      console.log('\n❌ FOUND 1970 ERRORS:');
      errors1970.forEach(s => {
        console.log(`  - ${s.name}: ${s.dueDateUtc.toISOString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error in schedule calculation:', error.message);
    console.error(error.stack);
  }
  
  await prismaService.$disconnect();
}

testFullFlow().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});