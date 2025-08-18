import { Test, TestingModule } from '@nestjs/testing';
import { ReplanDomainService } from './replan-domain.service';
import { BusinessDayService } from './business-day.service';
import { ProcessTemplate } from '../entities/process-template';
import { StepTemplate } from '../entities/step-template';

describe('ReplanDomainService', () => {
  let service: ReplanDomainService;
  let businessDayService: BusinessDayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplanDomainService,
        {
          provide: BusinessDayService,
          useValue: {
            addBusinessDays: jest.fn((date: Date, days: number) => {
              const result = new Date(date);
              result.setDate(result.getDate() + days);
              return Promise.resolve(result);
            }),
            subtractBusinessDays: jest.fn((date: Date, days: number) => {
              const result = new Date(date);
              result.setDate(result.getDate() - days);
              return Promise.resolve(result);
            }),
            adjustToBusinessDay: jest.fn((date: Date) => Promise.resolve(date)),
          },
        },
      ],
    }).compile();

    service = module.get<ReplanDomainService>(ReplanDomainService);
    businessDayService = module.get<BusinessDayService>(BusinessDayService);
  });

  describe('calculateScheduleV2', () => {
    it('should calculate both start and end dates correctly', async () => {
      const goalDate = new Date('2025-12-31');
      
      // Create mock step templates
      const stepTemplates = [
        new StepTemplate(
          1,
          1,
          1,
          'リード獲得',
          'goal',
          -30,
          [],
          [],
          new Date(),
          new Date(),
        ),
        new StepTemplate(
          9,
          1,
          9,
          'キックオフ',
          'goal',
          0,
          [],
          [],
          new Date(),
          new Date(),
        ),
      ];

      const processTemplate = new ProcessTemplate(
        1,
        '営業案件プロセス',
        1,
        true,
        new Date(),
        new Date(),
      );
      processTemplate.setStepTemplates(stepTemplates);

      const result = await service.calculateScheduleV2(processTemplate, goalDate);

      expect(result.steps).toHaveLength(2);
      expect(result.goalDate).toEqual(goalDate);
      
      const leadStep = result.steps.find(s => s.templateId === 1);
      expect(leadStep).toBeDefined();
      expect(leadStep?.dueDateUtc).toBeDefined();
      expect(leadStep?.startDateUtc).toBeDefined();
      expect(leadStep?.dueDateUtc.getFullYear()).toBeGreaterThanOrEqual(2025);
      expect(leadStep?.startDateUtc?.getFullYear()).toBeGreaterThanOrEqual(2025);
      
      const kickoffStep = result.steps.find(s => s.templateId === 9);
      expect(kickoffStep).toBeDefined();
      expect(kickoffStep?.dueDateUtc).toEqual(goalDate);
      expect(kickoffStep?.startDateUtc).toBeDefined();
    });

    it('should calculate dates for prev-based steps with dependencies', async () => {
      const goalDate = new Date('2025-12-31');
      
      const stepTemplates = [
        new StepTemplate(
          1,
          1,
          1,
          'リード獲得',
          'goal',
          -30,
          [],
          [],
          new Date(),
          new Date(),
        ),
        new StepTemplate(
          2,
          1,
          2,
          '初回コンタクト',
          'prev',
          2,
          [],
          [1],
          new Date(),
          new Date(),
        ),
        new StepTemplate(
          3,
          1,
          3,
          'ヒアリング面談',
          'prev',
          3,
          [],
          [2],
          new Date(),
          new Date(),
        ),
      ];

      const processTemplate = new ProcessTemplate(
        1,
        'テストプロセス',
        1,
        true,
        new Date(),
        new Date(),
      );
      processTemplate.setStepTemplates(stepTemplates);

      const result = await service.calculateScheduleV2(processTemplate, goalDate);

      expect(result.steps).toHaveLength(3);
      
      // Check that all dates are valid (not 1970)
      for (const step of result.steps) {
        expect(step.dueDateUtc).toBeDefined();
        expect(step.dueDateUtc.getFullYear()).toBeGreaterThanOrEqual(2025);
        console.log(`Step ${step.templateId}:${step.name} -> ${step.dueDateUtc.toISOString()}`);
      }
      
      // Check dependency order
      const step1Date = result.steps.find(s => s.templateId === 1)?.dueDateUtc!;
      const step2Date = result.steps.find(s => s.templateId === 2)?.dueDateUtc!;
      const step3Date = result.steps.find(s => s.templateId === 3)?.dueDateUtc!;
      
      expect(step2Date.getTime()).toBeGreaterThan(step1Date.getTime());
      expect(step3Date.getTime()).toBeGreaterThan(step2Date.getTime());
    });

    it('should handle complex dependencies correctly', async () => {
      const goalDate = new Date('2025-12-31');
      
      const stepTemplates = [
        new StepTemplate(1, 1, 1, 'Step1', 'goal', -10, [], [], new Date(), new Date()),
        new StepTemplate(2, 1, 2, 'Step2', 'prev', 2, [], [1], new Date(), new Date()),
        new StepTemplate(3, 1, 3, 'Step3', 'prev', 3, [], [1], new Date(), new Date()),
        new StepTemplate(4, 1, 4, 'Step4', 'prev', 1, [], [2, 3], new Date(), new Date()),
      ];

      const processTemplate = new ProcessTemplate(
        1,
        'Complex Process',
        1,
        true,
        new Date(),
        new Date(),
      );
      processTemplate.setStepTemplates(stepTemplates);

      const result = await service.calculateScheduleV2(processTemplate, goalDate);

      expect(result.steps).toHaveLength(4);
      
      // All dates should be valid
      for (const step of result.steps) {
        expect(step.dueDateUtc.getFullYear()).toBeGreaterThanOrEqual(2025);
      }
      
      // Step 4 should be after both Step 2 and Step 3
      const step2Date = result.steps.find(s => s.templateId === 2)?.dueDateUtc!;
      const step3Date = result.steps.find(s => s.templateId === 3)?.dueDateUtc!;
      const step4Date = result.steps.find(s => s.templateId === 4)?.dueDateUtc!;
      
      expect(step4Date.getTime()).toBeGreaterThanOrEqual(step2Date.getTime());
      expect(step4Date.getTime()).toBeGreaterThanOrEqual(step3Date.getTime());
    });

    it('should throw error for invalid dates (1970)', async () => {
      const goalDate = new Date('2025-12-31');
      
      // Create a step that would result in 1970 if calculation fails
      const stepTemplates = [
        new StepTemplate(
          1,
          1,
          1,
          'Invalid Step',
          'prev',
          5,
          [],
          [999], // Non-existent dependency
          new Date(),
          new Date(),
        ),
      ];

      const processTemplate = new ProcessTemplate(
        1,
        'Invalid Process',
        1,
        true,
        new Date(),
        new Date(),
      );
      processTemplate.setStepTemplates(stepTemplates);

      // Should throw an error due to validation
      await expect(service.calculateScheduleV2(processTemplate, goalDate))
        .rejects
        .toThrow();
    });
  });

  describe('correctTopologicalSort', () => {
    it('should sort templates in correct dependency order', () => {
      const stepTemplates = [
        new StepTemplate(1, 1, 1, 'Step1', 'goal', 0, [], [], new Date(), new Date()),
        new StepTemplate(2, 1, 2, 'Step2', 'prev', 1, [], [1], new Date(), new Date()),
        new StepTemplate(3, 1, 3, 'Step3', 'prev', 1, [], [2], new Date(), new Date()),
        new StepTemplate(4, 1, 4, 'Step4', 'prev', 1, [], [3], new Date(), new Date()),
      ];

      // Access private method for testing
      const sortedOrder = (service as any).correctTopologicalSort(stepTemplates);

      expect(sortedOrder).toEqual([1, 2, 3, 4]);
    });

    it('should handle multiple dependencies', () => {
      const stepTemplates = [
        new StepTemplate(1, 1, 1, 'Step1', 'goal', 0, [], [], new Date(), new Date()),
        new StepTemplate(2, 1, 2, 'Step2', 'goal', 0, [], [], new Date(), new Date()),
        new StepTemplate(3, 1, 3, 'Step3', 'prev', 1, [], [1, 2], new Date(), new Date()),
      ];

      const sortedOrder = (service as any).correctTopologicalSort(stepTemplates);

      // Step 3 should come after both 1 and 2
      const index3 = sortedOrder.indexOf(3);
      const index1 = sortedOrder.indexOf(1);
      const index2 = sortedOrder.indexOf(2);
      
      expect(index3).toBeGreaterThan(index1);
      expect(index3).toBeGreaterThan(index2);
    });

    it('should detect circular dependencies', () => {
      const stepTemplates = [
        new StepTemplate(1, 1, 1, 'Step1', 'prev', 1, [], [2], new Date(), new Date()),
        new StepTemplate(2, 1, 2, 'Step2', 'prev', 1, [], [3], new Date(), new Date()),
        new StepTemplate(3, 1, 3, 'Step3', 'prev', 1, [], [1], new Date(), new Date()),
      ];

      expect(() => (service as any).correctTopologicalSort(stepTemplates))
        .toThrow('Circular dependency detected');
    });
  });
});