import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { BusinessDayService } from '@domain/services/business-day.service';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';

@ApiTags('debug')
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    private readonly replanDomainService: ReplanDomainService,
    private readonly businessDayService: BusinessDayService,
    private readonly processTemplateRepository: ProcessTemplateRepository,
  ) {}

  @Get('test-schedule/:processId')
  @ApiOperation({ summary: 'Test schedule calculation for a process template' })
  async testScheduleCalculation(@Param('processId') processId: number) {
    this.logger.log(`Testing schedule calculation for process ${processId}`);
    
    const processTemplate = await this.processTemplateRepository.findWithStepTemplates(processId);
    
    if (!processTemplate) {
      return { error: `Process template ${processId} not found` };
    }
    
    const goalDate = new Date('2025-12-31');
    
    try {
      // Test V2 calculation
      const resultV2 = await this.replanDomainService.calculateScheduleV2(
        processTemplate,
        goalDate,
      );
      
      return {
        processId,
        processName: processTemplate.getName(),
        goalDate: goalDate.toISOString(),
        stepCount: processTemplate.getStepTemplates().length,
        v2Result: {
          steps: resultV2.steps.map(step => ({
            id: step.templateId,
            name: step.name,
            date: step.dueDateUtc.toISOString(),
            year: step.dueDateUtc.getFullYear(),
            dependencies: step.dependencies,
          })),
        },
        templates: processTemplate.getStepTemplates().map(t => ({
          id: t.getId(),
          seq: t.getSeq(),
          name: t.getName(),
          basis: t.getBasis().toString(),
          offset: t.getOffset().getDays(),
          dependencies: t.getDependsOn(),
        })),
      };
    } catch (error) {
      this.logger.error(`Error during test calculation: ${error.message}`, error.stack);
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get('test-business-days')
  @ApiOperation({ summary: 'Test business day calculations' })
  async testBusinessDays() {
    const testDate = new Date('2025-12-31');
    
    try {
      const add5Days = await this.businessDayService.addBusinessDays(testDate, 5);
      const subtract10Days = await this.businessDayService.subtractBusinessDays(testDate, 10);
      const isBusinessDay = await this.businessDayService.isBusinessDay(testDate);
      const adjustForward = await this.businessDayService.adjustToBusinessDay(testDate, 'forward');
      const adjustBackward = await this.businessDayService.adjustToBusinessDay(testDate, 'backward');
      
      return {
        testDate: testDate.toISOString(),
        add5Days: {
          result: add5Days.toISOString(),
          year: add5Days.getFullYear(),
        },
        subtract10Days: {
          result: subtract10Days.toISOString(),
          year: subtract10Days.getFullYear(),
        },
        isBusinessDay,
        adjustForward: {
          result: adjustForward.toISOString(),
          year: adjustForward.getFullYear(),
        },
        adjustBackward: {
          result: adjustBackward.toISOString(),
          year: adjustBackward.getFullYear(),
        },
      };
    } catch (error) {
      this.logger.error(`Error testing business days: ${error.message}`, error.stack);
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('test-date-calc')
  @ApiOperation({ summary: 'Test date calculation with custom input' })
  async testDateCalculation(@Body() body: { startDate: string; businessDays: number }) {
    const startDate = new Date(body.startDate);
    
    if (isNaN(startDate.getTime())) {
      return { error: 'Invalid start date' };
    }
    
    try {
      const result = await this.businessDayService.addBusinessDays(
        startDate,
        body.businessDays,
      );
      
      return {
        input: {
          startDate: startDate.toISOString(),
          businessDays: body.businessDays,
        },
        result: {
          date: result.toISOString(),
          year: result.getFullYear(),
          month: result.getMonth() + 1,
          day: result.getDate(),
        },
      };
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  }
}