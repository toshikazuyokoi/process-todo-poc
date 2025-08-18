import { validate } from 'class-validator';
import { CreateProcessTemplateDto, CreateStepTemplateDto } from './create-process-template.dto';

describe('CreateProcessTemplateDto', () => {
  let dto: CreateProcessTemplateDto;

  beforeEach(() => {
    dto = new CreateProcessTemplateDto();
  });

  describe('name validation', () => {
    it('should fail when name is empty', async () => {
      dto.name = '';
      dto.stepTemplates = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should pass with valid name', async () => {
      dto.name = '営業案件プロセス';
      dto.stepTemplates = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });


  describe('stepTemplates validation', () => {
    it('should pass with empty step templates', async () => {
      dto.name = 'Test Process';
      dto.stepTemplates = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid step template', async () => {
      dto.name = 'Test Process';
      
      const invalidStep = new CreateStepTemplateDto();
      invalidStep.seq = -1; // Invalid sequence
      invalidStep.name = '';
      invalidStep.basis = 'invalid' as any;
      invalidStep.offsetDays = -100;
      
      dto.stepTemplates = [invalidStep];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('stepTemplates');
    });

    it('should pass with valid step templates', async () => {
      dto.name = 'Test Process';
      
      const step1 = new CreateStepTemplateDto();
      step1.seq = 1;
      step1.name = 'リード獲得';
      step1.basis = 'goal';
      step1.offsetDays = -30;
      step1.requiredArtifacts = [];
      step1.dependsOn = [];
      
      const step2 = new CreateStepTemplateDto();
      step2.seq = 2;
      step2.name = '初回コンタクト';
      step2.basis = 'prev';
      step2.offsetDays = 3;
      step2.requiredArtifacts = [];
      step2.dependsOn = [1];
      
      dto.stepTemplates = [step1, step2];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('should validate nested requiredArtifacts', async () => {
      dto.name = 'Test Process';
      
      const step = new CreateStepTemplateDto();
      step.seq = 1;
      step.name = 'Document Step';
      step.basis = 'goal';
      step.offsetDays = 0;
      step.requiredArtifacts = [
        { kind: 'document', description: 'Proposal document' },
        { kind: 'presentation', description: 'Sales deck' },
      ];
      step.dependsOn = [];
      
      dto.stepTemplates = [step];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate dependency references', async () => {
      dto.name = 'Test Process';
      
      const step1 = new CreateStepTemplateDto();
      step1.seq = 1;
      step1.name = 'Step 1';
      step1.basis = 'goal';
      step1.offsetDays = -10;
      step1.requiredArtifacts = [];
      step1.dependsOn = [];
      
      const step2 = new CreateStepTemplateDto();
      step2.seq = 2;
      step2.name = 'Step 2';
      step2.basis = 'prev';
      step2.offsetDays = 2;
      step2.requiredArtifacts = [];
      step2.dependsOn = [1]; // Depends on step 1
      
      const step3 = new CreateStepTemplateDto();
      step3.seq = 3;
      step3.name = 'Step 3';
      step3.basis = 'prev';
      step3.offsetDays = 1;
      step3.requiredArtifacts = [];
      step3.dependsOn = [1, 2]; // Depends on both step 1 and 2
      
      dto.stepTemplates = [step1, step2, step3];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});