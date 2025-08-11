import { PrismaClient } from '@prisma/client';
import { PrismaService } from './src/infrastructure/prisma/prisma.service';
import { ProcessTemplateRepository } from './src/infrastructure/repositories/process-template.repository';
import { ReplanDomainService } from './src/domain/services/replan-domain.service';
import { BusinessDayService } from './src/domain/services/business-day.service';
import { HolidayRepository } from './src/infrastructure/repositories/holiday.repository';

async function testSchedule() {
  const prisma = new PrismaClient();
  const prismaService = new PrismaService();
  const holidayRepo = new HolidayRepository(prismaService);
  const businessDayService = new BusinessDayService(holidayRepo);
  const replanService = new ReplanDomainService(businessDayService);
  const templateRepo = new ProcessTemplateRepository(prismaService);
  
  try {
    // Get onboarding template (ID 20)
    const template = await templateRepo.findWithStepTemplates(20);
    
    if (!template) {
      console.log('Template not found');
      return;
    }
    
    console.log(`Template: ${template.getName()}`);
    console.log(`Steps: ${template.getStepTemplates().length}`);
    
    const goalDate = new Date('2025-12-31T00:00:00.000Z');
    console.log(`Goal date: ${goalDate.toISOString()}`);
    
    // Calculate schedule using V2
    const schedule = await replanService.calculateScheduleV2(
      template,
      goalDate
    );
    
    console.log('\n=== Schedule Results ===');
    for (const step of schedule.steps) {
      const year = step.dueDateUtc.getFullYear();
      const flag = year < 2000 ? ' ❌ ERROR: 1970!' : '';
      console.log(`${step.name}: ${step.dueDateUtc.toISOString()} (Year: ${year})${flag}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchedule();