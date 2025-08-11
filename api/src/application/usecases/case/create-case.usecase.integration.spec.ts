import { Test, TestingModule } from '@nestjs/testing';
import { CreateCaseUseCase } from './create-case.usecase';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CaseRepository } from '@infrastructure/repositories/case.repository';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';
import { StepInstanceRepository } from '@infrastructure/repositories/step-instance.repository';
import { HolidayRepository } from '@infrastructure/repositories/holiday.repository';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { BusinessDayService } from '@domain/services/business-day.service';
import { CreateCaseDto } from '@application/dto/case/create-case.dto';

describe('CreateCaseUseCase Integration Test', () => {
  let useCase: CreateCaseUseCase;
  let prismaService: PrismaService;
  let replanService: ReplanDomainService;
  let businessDayService: BusinessDayService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCaseUseCase,
        PrismaService,
        CaseRepository,
        ProcessTemplateRepository,
        StepInstanceRepository,
        HolidayRepository,
        ReplanDomainService,
        BusinessDayService,
        {
          provide: 'ICaseRepository',
          useClass: CaseRepository,
        },
        {
          provide: 'IProcessTemplateRepository',
          useClass: ProcessTemplateRepository,
        },
        {
          provide: 'IStepInstanceRepository',
          useClass: StepInstanceRepository,
        },
        {
          provide: 'IHolidayRepository',
          useClass: HolidayRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateCaseUseCase>(CreateCaseUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
    replanService = module.get<ReplanDomainService>(ReplanDomainService);
    businessDayService = module.get<BusinessDayService>(BusinessDayService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  describe('Create case with real database', () => {
    it('should calculate dates correctly for all steps', async () => {
      const dto: CreateCaseDto = {
        processId: 1,
        title: 'Integration Test Case',
        goalDateUtc: '2025-12-31',
        createdBy: 1,
      };

      console.log('\n=== Starting Integration Test ===');
      console.log('Goal Date:', dto.goalDateUtc);

      // Test business day calculation directly
      const testDate = new Date('2025-12-31');
      const add5Days = await businessDayService.addBusinessDays(testDate, 5);
      const subtract10Days = await businessDayService.subtractBusinessDays(testDate, 10);
      
      console.log('\n=== Business Day Service Test ===');
      console.log('Test date:', testDate.toISOString());
      console.log('Add 5 days:', add5Days.toISOString(), 'Year:', add5Days.getFullYear());
      console.log('Subtract 10 days:', subtract10Days.toISOString(), 'Year:', subtract10Days.getFullYear());

      // Check if dates are in 1970
      if (subtract10Days.getFullYear() < 2000) {
        console.error('ERROR: BusinessDayService returned 1970 date!');
      }

      // Test with ProcessTemplate
      const processTemplateRepo = new ProcessTemplateRepository(prismaService);
      const processTemplate = await processTemplateRepo.findWithStepTemplates(dto.processId);
      
      if (!processTemplate) {
        throw new Error('Process template not found');
      }

      console.log('\n=== Process Template Info ===');
      console.log('Template ID:', processTemplate.getId());
      console.log('Template Name:', processTemplate.getName());
      console.log('Step count:', processTemplate.getStepTemplates().length);

      // Test schedule calculation
      console.log('\n=== Testing Schedule Calculation ===');
      const schedulePlan = await replanService.calculateScheduleV2(
        processTemplate,
        new Date(dto.goalDateUtc),
      );

      console.log('\n=== Schedule Plan Results ===');
      schedulePlan.steps.forEach(step => {
        const year = step.dueDateUtc.getFullYear();
        const is1970 = year < 2000;
        console.log(`Step ${step.templateId}: ${step.name}`);
        console.log(`  Date: ${step.dueDateUtc.toISOString()}`);
        console.log(`  Year: ${year} ${is1970 ? '❌ ERROR: 1970!' : '✅'}`);
        console.log(`  Dependencies: ${step.dependencies}`);
      });

      // Create actual case
      const result = await useCase.execute(dto);

      console.log('\n=== Created Case Result ===');
      console.log('Case ID:', result.id);
      console.log('Step Instances:');
      
      result.stepInstances.forEach(step => {
        if (step.dueDateUtc) {
          const date = new Date(step.dueDateUtc);
          const year = date.getFullYear();
          const is1970 = year < 2000;
          console.log(`  ${step.templateId}: ${step.name}`);
          console.log(`    Date: ${step.dueDateUtc}`);
          console.log(`    Year: ${year} ${is1970 ? '❌ ERROR: 1970!' : '✅'}`);
        } else {
          console.log(`  ${step.templateId}: ${step.name} - NO DATE`);
        }
      });

      // Verify no 1970 dates
      const steps1970 = result.stepInstances.filter(step => {
        if (!step.dueDateUtc) return false;
        const year = new Date(step.dueDateUtc).getFullYear();
        return year < 2000;
      });

      if (steps1970.length > 0) {
        console.error('\n❌ FAILED: Found steps with 1970 dates:');
        steps1970.forEach(step => {
          console.error(`  - ${step.name}: ${step.dueDateUtc}`);
        });
      } else {
        console.log('\n✅ SUCCESS: All dates are calculated correctly!');
      }

      expect(steps1970.length).toBe(0);
      expect(result.stepInstances.length).toBe(9);

      // Clean up
      await prismaService.stepInstance.deleteMany({
        where: { caseId: result.id }
      });
      await prismaService.case.delete({
        where: { id: result.id }
      });
    });
  });
});