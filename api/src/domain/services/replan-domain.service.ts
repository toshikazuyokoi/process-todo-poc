import { Injectable, Logger } from '@nestjs/common';
import { ProcessTemplate } from '../entities/process-template';
import { StepTemplate } from '../entities/step-template';
import { StepInstance } from '../entities/step-instance';
import { BusinessDayService } from './business-day.service';

export interface StepSchedule {
  templateId: number;
  name: string;
  startDateUtc: Date;
  dueDateUtc: Date;
  dependencies: number[];
}

export interface SchedulePlan {
  goalDate: Date;
  steps: StepSchedule[];
}

export interface ScheduleDiff {
  stepId: number;
  stepName: string;
  oldStartDate: Date | null;
  newStartDate: Date;
  oldDueDate: Date | null;
  newDueDate: Date;
  isLocked: boolean;
}

@Injectable()
export class ReplanDomainService {
  private readonly logger = new Logger(ReplanDomainService.name);
  
  constructor(private readonly businessDayService: BusinessDayService) {}

  /**
   * 修正版: トポロジカルソートで正しい処理順序を決定
   */
  private correctTopologicalSort(templates: StepTemplate[]): number[] {
    const graph = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    
    // グラフ構築
    for (const template of templates) {
      const id = template.getId()!;
      graph.set(id, []);
      inDegree.set(id, 0);
    }
    
    // 依存関係の設定（逆向き: dependency -> dependent）
    for (const template of templates) {
      const id = template.getId()!;
      const deps = template.getDependsOn();
      for (const depId of deps) {
        if (graph.has(depId)) {
          graph.get(depId)!.push(id);
          inDegree.set(id, inDegree.get(id)! + 1);
        }
      }
    }
    
    // BFSでトポロジカルソート
    const queue: number[] = [];
    const result: number[] = [];
    
    // 入次数0のノードから開始
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    if (result.length !== templates.length) {
      throw new Error('Circular dependency detected in step templates');
    }
    
    return result;
  }

  /**
   * ゴール基準の日付計算
   */
  private async calculateGoalBasedDate(
    template: StepTemplate,
    goalDate: Date,
    countryCode: string = 'JP'
  ): Promise<Date> {
    try {
      this.logger.debug(`calculateGoalBasedDate: template=${template.getId()}:${template.getName()}, goalDate=${goalDate.toISOString()}`);
      
      const offsetDays = Math.abs(template.getOffset().getDays());
      this.logger.debug(`  Offset days: ${offsetDays}`);
      
      const baseDate = await this.businessDayService.subtractBusinessDays(
        goalDate,
        offsetDays,
        countryCode,
      );
      this.logger.debug(`  Base date after subtraction: ${baseDate.toISOString()}`);
      
      const adjustedDate = await this.businessDayService.adjustToBusinessDay(
        baseDate,
        'backward',
        countryCode,
      );
      this.logger.debug(`  Final adjusted date: ${adjustedDate.toISOString()}`);
      
      return adjustedDate;
    } catch (error) {
      this.logger.error(`Error calculating goal-based date for template ${template.getId()}:${template.getName()}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 前工程基準の日付計算（修正版）
   */
  private async calculatePrevBasedDateV2(
    template: StepTemplate,
    calculatedDates: Map<number, { startDate: Date; endDate: Date }>,
    templateMap: Map<number, StepTemplate>,
    goalDate: Date,
    countryCode: string = 'JP'
  ): Promise<Date> {
    try {
      this.logger.debug(`calculatePrevBasedDateV2: template=${template.getId()}:${template.getName()}`);
      
      const dependencies = template.getDependsOn();
      const offsetDays = Math.abs(template.getOffset().getDays());
      this.logger.debug(`  Dependencies: ${dependencies}, Offset: ${offsetDays}`);
      
      let baseDate: Date;
      
      if (dependencies.length > 0) {
        // 明示的な依存関係がある場合
        const depDates: Date[] = [];
        
        for (const depId of dependencies) {
          const depSchedule = calculatedDates.get(depId);
          if (!depSchedule) {
            this.logger.error(`Dependency ${depId} not calculated for template ${template.getId()}:${template.getName()}`);
            this.logger.error(`Available dates: ${Array.from(calculatedDates.keys())}`);
            
            // フォールバック: ゴール日付から逆算
            this.logger.warn(`Using fallback for dependency ${depId}`);
            const fallbackDays = Math.max(30, offsetDays * 2); // 最低30日前
            const fallbackDate = await this.businessDayService.subtractBusinessDays(
              goalDate,
              fallbackDays,
              countryCode
            );
            depDates.push(fallbackDate);
            continue;
          }
          
          // 依存ステップの終了日を使用
          const depDate = depSchedule.endDate;
          
          // 1970年チェック
          if (depDate.getFullYear() < 2000) {
            this.logger.error(`Invalid dependency date for ${depId}: ${depDate.toISOString()}`);
            const fallbackDays = Math.max(30, offsetDays * 2);
            const fallbackDate = await this.businessDayService.subtractBusinessDays(
              goalDate,
              fallbackDays,
              countryCode
            );
            depDates.push(fallbackDate);
            continue;
          }
          
          this.logger.debug(`  Dependency ${depId} end date: ${depDate.toISOString()}`);
          depDates.push(depDate);
        }
        
        // 最も遅い依存日付を基準とする
        baseDate = new Date(Math.max(...depDates.map(d => d.getTime())));
        this.logger.debug(`  Latest dependency date: ${baseDate.toISOString()}`);
      } else {
        // 依存関係がない場合、seq-1を探す
        const prevSeq = template.getSeq() - 1;
        let prevDate: Date | null = null;
        
        for (const [id, t] of templateMap) {
          if (t.getSeq() === prevSeq) {
            const prevSchedule = calculatedDates.get(id);
            prevDate = prevSchedule ? prevSchedule.endDate : null;
            break;
          }
        }
        
        if (!prevDate) {
          // フォールバック：ゴール日付から逆算
          this.logger.warn(`No previous step for ${template.getId()}:${template.getName()}, using goal date as fallback`);
          const fallbackDate = await this.businessDayService.subtractBusinessDays(
            goalDate,
            offsetDays,
            countryCode
          );
          this.logger.debug(`  Fallback date: ${fallbackDate.toISOString()}`);
          return fallbackDate;
        }
        
        baseDate = prevDate;
        this.logger.debug(`  Previous step date: ${baseDate.toISOString()}`);
      }
      
      // オフセット日数を加算
      const calculatedDate = await this.businessDayService.addBusinessDays(
        baseDate,
        offsetDays,
        countryCode
      );
      this.logger.debug(`  Date after adding offset: ${calculatedDate.toISOString()}`);
      
      // 営業日調整
      const adjustedDate = await this.businessDayService.adjustToBusinessDay(
        calculatedDate,
        'backward',
        countryCode
      );
      this.logger.debug(`  Final adjusted date: ${adjustedDate.toISOString()}`);
      
      return adjustedDate;
    } catch (error) {
      this.logger.error(`Error calculating prev-based date for template ${template.getId()}:${template.getName()}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async calculatePrevBasedDate(
    template: StepTemplate,
    calculatedDates: Map<number, Date>,
    templateMap: Map<number, StepTemplate>,
    goalDate: Date,
    countryCode: string = 'JP'
  ): Promise<Date> {
    try {
      this.logger.debug(`calculatePrevBasedDate: template=${template.getId()}:${template.getName()}`);
      
      const dependencies = template.getDependsOn();
      const offsetDays = Math.abs(template.getOffset().getDays());
      this.logger.debug(`  Dependencies: ${dependencies}, Offset: ${offsetDays}`);
      
      let baseDate: Date;
      
      if (dependencies.length > 0) {
        // 明示的な依存関係がある場合
        const depDates: Date[] = [];
        
        for (const depId of dependencies) {
          const depDate = calculatedDates.get(depId);
          if (!depDate) {
            this.logger.error(`Dependency ${depId} not calculated for template ${template.getId()}:${template.getName()}`);
            this.logger.error(`Available dates: ${Array.from(calculatedDates.keys())}`);
            
            // フォールバック: ゴール日付から逆算
            this.logger.warn(`Using fallback for dependency ${depId}`);
            const fallbackDays = Math.max(30, offsetDays * 2); // 最低30日前
            const fallbackDate = await this.businessDayService.subtractBusinessDays(
              goalDate,
              fallbackDays,
              countryCode
            );
            depDates.push(fallbackDate);
            continue;
          }
          
          // 1970年チェック
          if (depDate.getFullYear() < 2000) {
            this.logger.error(`Invalid dependency date for ${depId}: ${depDate.toISOString()}`);
            const fallbackDays = Math.max(30, offsetDays * 2);
            const fallbackDate = await this.businessDayService.subtractBusinessDays(
              goalDate,
              fallbackDays,
              countryCode
            );
            depDates.push(fallbackDate);
            continue;
          }
          
          this.logger.debug(`  Dependency ${depId} date: ${depDate.toISOString()}`);
          depDates.push(depDate);
        }
        
        // 最も遅い依存日付を基準とする
        baseDate = new Date(Math.max(...depDates.map(d => d.getTime())));
        this.logger.debug(`  Latest dependency date: ${baseDate.toISOString()}`);
      } else {
        // 依存関係がない場合、seq-1を探す
        const prevSeq = template.getSeq() - 1;
        let prevDate: Date | null = null;
        
        for (const [id, t] of templateMap) {
          if (t.getSeq() === prevSeq) {
            prevDate = calculatedDates.get(id) || null;
            break;
          }
        }
        
        if (!prevDate) {
          // フォールバック：ゴール日付から逆算
          this.logger.warn(`No previous step for ${template.getId()}:${template.getName()}, using goal date as fallback`);
          const fallbackDate = await this.businessDayService.subtractBusinessDays(
            goalDate,
            offsetDays,
            countryCode
          );
          this.logger.debug(`  Fallback date: ${fallbackDate.toISOString()}`);
          return fallbackDate;
        }
        
        baseDate = prevDate;
        this.logger.debug(`  Previous step date: ${baseDate.toISOString()}`);
      }
      
      // オフセット日数を加算
      const calculatedDate = await this.businessDayService.addBusinessDays(
        baseDate,
        offsetDays,
        countryCode
      );
      this.logger.debug(`  Date after adding offset: ${calculatedDate.toISOString()}`);
      
      // 営業日調整
      const adjustedDate = await this.businessDayService.adjustToBusinessDay(
        calculatedDate,
        'backward',
        countryCode
      );
      this.logger.debug(`  Final adjusted date: ${adjustedDate.toISOString()}`);
      
      return adjustedDate;
    } catch (error) {
      this.logger.error(`Error calculating prev-based date for template ${template.getId()}:${template.getName()}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 計算結果の検証
   */
  private validateAllDatesCalculated(
    templates: StepTemplate[],
    calculatedDates: Map<number, { startDate: Date; endDate: Date }>
  ): void {
    for (const template of templates) {
      const id = template.getId()!;
      const schedule = calculatedDates.get(id);
      
      if (!schedule) {
        throw new Error(
          `Date not calculated for template ${id}:${template.getName()}`
        );
      }
      
      // 1970年チェック
      if (schedule.startDate.getFullYear() < 2000 || schedule.endDate.getFullYear() < 2000) {
        throw new Error(
          `Invalid date calculated for template ${id}:${template.getName()}: start=${schedule.startDate.toISOString()}, end=${schedule.endDate.toISOString()}`
        );
      }
    }
  }

  /**
   * 修正版スケジュール計算関数
   */
  async calculateScheduleV2(
    processTemplate: ProcessTemplate,
    goalDate: Date,
    existingSteps: StepInstance[] = [],
    lockedStepIds: Set<number> = new Set(),
    countryCode: string = 'JP',
  ): Promise<SchedulePlan> {
    this.logger.log('=== calculateScheduleV2 START ===');
    this.logger.log(`Goal date: ${goalDate.toISOString()}`);
    this.logger.log(`Process template: ${processTemplate.getId()}:${processTemplate.getName()}`);
    this.logger.log(`Step templates count: ${processTemplate.getStepTemplates().length}`);
    
    // Step 1: 初期化とデータ準備
    const stepTemplates = processTemplate.getStepTemplates();
    const stepSchedules = new Map<number, { startDate: Date; endDate: Date }>();
    
    // Validate dependencies exist
    const templateIds = new Set(stepTemplates.map(t => t.getId()).filter(id => id !== undefined) as number[]);
    for (const template of stepTemplates) {
      for (const depId of template.getDependsOn()) {
        if (!templateIds.has(depId)) {
          const error = `Dependency ${depId} not found for template ${template.getId()}:${template.getName()}`;
          this.logger.error(error);
          this.logger.error(`Available template IDs: ${Array.from(templateIds).join(', ')}`);
          throw new Error(error);
        }
      }
    }
    const lockedSchedules = new Map<number, Date>();
    const templateMap = new Map<number, StepTemplate>();
    
    // テンプレートマップを構築
    for (const template of stepTemplates) {
      if (template.getId()) {
        templateMap.set(template.getId()!, template);
      }
    }
    
    // ロックされた日付を設定
    for (const existing of existingSteps) {
      const templateId = existing.getTemplateId();
      if (templateId && lockedStepIds.has(existing.getId()!)) {
        lockedSchedules.set(templateId, existing.getDueDate()!.getDate());
      }
    }
    
    // Step 2: トポロジカルソート
    const sortedOrder = this.correctTopologicalSort(stepTemplates);
    this.logger.log(`Topological sort order: ${sortedOrder}`);
    
    // Step 3: ゴール基準のステップを最初に計算
    this.logger.log('=== Calculating goal-based steps ===');
    for (const templateId of sortedOrder) {
      const template = templateMap.get(templateId);
      if (!template) continue;
      
      if (lockedSchedules.has(templateId)) {
        const lockedDate = lockedSchedules.get(templateId)!;
        // ロックされた場合は期限日から開始日を逆算
        const duration = Math.abs(template.getOffset().getDays()) || 1;
        const startDate = await this.businessDayService.subtractBusinessDays(
          lockedDate,
          duration - 1,
          countryCode
        );
        stepSchedules.set(templateId, { startDate, endDate: lockedDate });
        this.logger.debug(`Template ${templateId}:${template.getName()} is locked`);
        continue;
      }
      
      if (template.getBasis().isGoal()) {
        const endDate = await this.calculateGoalBasedDate(template, goalDate, countryCode);
        // 期限日から開始日を逆算
        const duration = Math.abs(template.getOffset().getDays()) || 1;
        const startDate = await this.businessDayService.subtractBusinessDays(
          endDate,
          duration - 1,
          countryCode
        );
        stepSchedules.set(templateId, { startDate, endDate });
        this.logger.log(`Goal-based ${templateId}:${template.getName()} -> start: ${startDate.toISOString()}, end: ${endDate.toISOString()}`);
      }
    }
    
    // Step 4: 前工程基準のステップを依存順に計算
    this.logger.log('=== Calculating prev-based steps ===');
    for (const templateId of sortedOrder) {
      const template = templateMap.get(templateId);
      if (!template) continue;
      
      // すでに計算済み（ゴール基準またはロック済み）の場合はスキップ
      if (stepSchedules.has(templateId)) {
        continue;
      }
      
      if (!template.getBasis().isGoal()) {
        const endDate = await this.calculatePrevBasedDateV2(
          template,
          stepSchedules,
          templateMap,
          goalDate,
          countryCode
        );
        // 期限日から開始日を計算
        const duration = Math.abs(template.getOffset().getDays()) || 1;
        let startDate: Date;
        
        // 依存関係がある場合は、依存ステップの終了日の翌営業日から開始
        const dependencies = template.getDependsOn();
        if (dependencies.length > 0) {
          const depEndDates: Date[] = [];
          for (const depId of dependencies) {
            const depSchedule = stepSchedules.get(depId);
            if (depSchedule) {
              depEndDates.push(depSchedule.endDate);
            }
          }
          if (depEndDates.length > 0) {
            const latestDepEnd = new Date(Math.max(...depEndDates.map(d => d.getTime())));
            startDate = await this.businessDayService.addBusinessDays(
              latestDepEnd,
              1,
              countryCode
            );
          } else {
            // 依存関係が解決できない場合は期限日から逆算
            startDate = await this.businessDayService.subtractBusinessDays(
              endDate,
              duration - 1,
              countryCode
            );
          }
        } else {
          // 依存関係がない場合は期限日から逆算
          startDate = await this.businessDayService.subtractBusinessDays(
            endDate,
            duration - 1,
            countryCode
          );
        }
        
        stepSchedules.set(templateId, { startDate, endDate });
        this.logger.log(`Prev-based ${templateId}:${template.getName()} -> start: ${startDate.toISOString()}, end: ${endDate.toISOString()}`);
      }
    }
    
    // Step 5: 検証
    this.logger.log('=== Validating results ===');
    this.validateAllDatesCalculated(stepTemplates, stepSchedules);
    
    // Step 6: 結果を構築
    const steps: StepSchedule[] = stepTemplates.map((template) => {
      const templateId = template.getId()!;
      const schedule = stepSchedules.get(templateId);
      
      if (!schedule) {
        throw new Error(`Failed to get scheduled date for ${templateId}`);
      }
      
      return {
        templateId,
        name: template.getName(),
        startDateUtc: schedule.startDate,
        dueDateUtc: schedule.endDate,
        dependencies: template.getDependsOn(),
      };
    });
    
    this.logger.log('=== calculateScheduleV2 END ===');
    this.logger.log(`Successfully calculated dates for ${steps.length} steps`);
    
    return {
      goalDate,
      steps,
    };
  }

  async calculateSchedule(
    processTemplate: ProcessTemplate,
    goalDate: Date,
    existingSteps: StepInstance[] = [],
    lockedStepIds: Set<number> = new Set(),
    countryCode: string = 'JP',
  ): Promise<SchedulePlan> {
    const stepTemplates = processTemplate.getStepTemplates();
    const stepSchedules = new Map<number, Date>();
    const lockedSchedules = new Map<number, Date>();
    
    // Set up locked schedules
    for (const existing of existingSteps) {
      const templateId = existing.getTemplateId();
      if (templateId && lockedStepIds.has(existing.getId()!)) {
        lockedSchedules.set(templateId, existing.getDueDate()!.getDate());
      }
    }
    
    // Create a map for quick template lookup
    const templateMap = new Map<number, StepTemplate>();
    for (const template of stepTemplates) {
      if (template.getId()) {
        templateMap.set(template.getId()!, template);
      }
    }
    
    // Recursive function to calculate date for a template
    const calculateTemplateDate = async (templateId: number): Promise<Date> => {
      // Check if already calculated
      if (stepSchedules.has(templateId)) {
        const cached = stepSchedules.get(templateId)!;
        console.log(`  Using cached date for ${templateId}: ${cached.toISOString()}`);
        return cached;
      }
      
      // Check if locked
      if (lockedSchedules.has(templateId)) {
        const lockedDate = lockedSchedules.get(templateId)!;
        stepSchedules.set(templateId, lockedDate);
        console.log(`  Using locked date for ${templateId}: ${lockedDate.toISOString()}`);
        return lockedDate;
      }
      
      const template = templateMap.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      console.log(`Calculating date for ${templateId}:${template.getName()}, basis=${template.getBasis().toString()}, deps=${template.getDependsOn()}`)
      
      let baseDate: Date;
      const offsetDays = template.getOffset().getDays();
      
      if (template.getBasis().isGoal()) {
        // Goal-based: calculate from goal date
        baseDate = await this.businessDayService.subtractBusinessDays(
          goalDate,
          Math.abs(offsetDays),
          countryCode,
        );
      } else {
        // Prev-based: calculate from dependencies
        const dependencies = template.getDependsOn();
        
        if (dependencies.length > 0) {
          // Has explicit dependencies
          let latestDependencyDate: Date | null = null;
          
          for (const depId of dependencies) {
            const depDate = await calculateTemplateDate(depId);
            if (!latestDependencyDate || depDate > latestDependencyDate) {
              latestDependencyDate = depDate;
            }
          }
          
          if (!latestDependencyDate) {
            throw new Error(`Failed to calculate dependency dates for template ${templateId}`);
          }
          
          baseDate = await this.businessDayService.addBusinessDays(
            latestDependencyDate,
            Math.abs(offsetDays),
            countryCode,
          );
        } else {
          // No explicit dependencies - this shouldn't happen for prev-based
          // But if it does, use the previous step by sequence
          const currentSeq = template.getSeq();
          let prevStepDate: Date | null = null;
          
          // Find the step with the previous sequence number
          for (const [tid, t] of templateMap.entries()) {
            if (t.getSeq() === currentSeq - 1) {
              prevStepDate = await calculateTemplateDate(tid);
              break;
            }
          }
          
          if (prevStepDate) {
            baseDate = await this.businessDayService.addBusinessDays(
              prevStepDate,
              Math.abs(offsetDays),
              countryCode,
            );
          } else {
            // Fallback: calculate from goal
            console.warn(`No previous step found for template ${templateId}, using goal date`);
            baseDate = await this.businessDayService.subtractBusinessDays(
              goalDate,
              Math.abs(offsetDays),
              countryCode,
            );
          }
        }
      }
      
      // Adjust to business day
      const adjustedDate = await this.businessDayService.adjustToBusinessDay(
        baseDate,
        'backward',
        countryCode,
      );
      
      stepSchedules.set(templateId, adjustedDate);
      console.log(`  Calculated date for ${templateId}: ${adjustedDate.toISOString()}`);
      return adjustedDate;
    };
    
    // Calculate all template dates
    console.log('Starting calculation for', stepTemplates.length, 'templates');
    for (const template of stepTemplates) {
      if (template.getId()) {
        console.log(`Processing template ${template.getId()}:${template.getName()}`);
        try {
          const calculatedDate = await calculateTemplateDate(template.getId()!);
          console.log(`Successfully calculated date for ${template.getId()}: ${calculatedDate.toISOString()}`);
        } catch (error) {
          console.error(`Failed to calculate date for template ${template.getId()}:${template.getName()}`, error);
          throw error;
        }
      }
    }
    console.log('All calculations complete. StepSchedules has', stepSchedules.size, 'entries');
    
    const steps: StepSchedule[] = await Promise.all(
      stepTemplates.map(async (template) => {
        const templateId = template.getId()!;
        const scheduledDate = stepSchedules.get(templateId);
        
        if (!scheduledDate) {
          console.error(`No scheduled date found for template ${templateId}:${template.getName()}`);
          throw new Error(`Failed to calculate date for template ${templateId}:${template.getName()}`);
        }
        
        // 開始日を計算（簡易版：期限日から作業日数を引く）
        const duration = Math.abs(templateMap.get(templateId)?.getOffset().getDays() || 1);
        const startDate = await this.businessDayService.subtractBusinessDays(
          scheduledDate,
          duration - 1,
          countryCode
        );
        
        return {
          templateId,
          name: template.getName(),
          startDateUtc: startDate,
          dueDateUtc: scheduledDate,
          dependencies: template.getDependsOn(),
        };
      })
    );
    
    return {
      goalDate,
      steps,
    };
  }

  calculateDiff(
    newPlan: SchedulePlan,
    existingSteps: StepInstance[],
    lockedStepIds: Set<number> = new Set(),
  ): ScheduleDiff[] {
    const diffs: ScheduleDiff[] = [];
    const newScheduleMap = new Map(
      newPlan.steps.map((s) => [s.templateId, s]),
    );
    
    for (const existing of existingSteps) {
      const templateId = existing.getTemplateId();
      if (!templateId) continue;
      
      const newSchedule = newScheduleMap.get(templateId);
      if (!newSchedule) continue;
      
      const oldStartDate = existing.getStartDate()?.getDate() || null;
      const oldDueDate = existing.getDueDate()?.getDate() || null;
      const isLocked = lockedStepIds.has(existing.getId()!);
      
      if (isLocked && oldDueDate) {
        continue;
      }
      
      if (!oldDueDate || oldDueDate.getTime() !== newSchedule.dueDateUtc.getTime() ||
          !oldStartDate || oldStartDate.getTime() !== newSchedule.startDateUtc.getTime()) {
        diffs.push({
          stepId: existing.getId()!,
          stepName: existing.getName(),
          oldStartDate,
          newStartDate: newSchedule.startDateUtc,
          oldDueDate,
          newDueDate: newSchedule.dueDateUtc,
          isLocked,
        });
      }
    }
    
    return diffs;
  }

  private topologicalSort(stepTemplates: StepTemplate[]): StepTemplate[] {
    const sorted: StepTemplate[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();
    
    const templateMap = new Map(
      stepTemplates.map((t) => [t.getId()!, t]),
    );
    
    const visit = (templateId: number): void => {
      if (visited.has(templateId)) return;
      if (visiting.has(templateId)) {
        throw new Error('Circular dependency detected in step templates');
      }
      
      visiting.add(templateId);
      
      const template = templateMap.get(templateId);
      if (template) {
        const dependencies = template.getDependsOn();
        for (const depId of dependencies) {
          if (templateMap.has(depId)) {
            visit(depId);
          }
        }
        sorted.push(template);
      }
      
      visiting.delete(templateId);
      visited.add(templateId);
    };
    
    for (const template of stepTemplates) {
      const templateId = template.getId();
      if (templateId !== null) {
        visit(templateId);
      }
    }
    
    return sorted;
  }

  validateSchedule(plan: SchedulePlan): boolean {
    const { steps } = plan;
    const scheduleMap = new Map(steps.map((s) => [s.templateId, s.dueDateUtc]));
    
    for (const step of steps) {
      for (const depId of step.dependencies) {
        const depDate = scheduleMap.get(depId);
        if (depDate && depDate > step.dueDateUtc) {
          return false;
        }
      }
      
      if (step.dueDateUtc > plan.goalDate) {
        return false;
      }
    }
    
    return true;
  }

  findCriticalPath(plan: SchedulePlan): number[] {
    const { steps } = plan;
    const criticalPath: number[] = [];
    
    const stepMap = new Map(steps.map((s) => [s.templateId, s]));
    const slackMap = new Map<number, number>();
    
    const calculateSlack = (templateId: number): number => {
      if (slackMap.has(templateId)) {
        return slackMap.get(templateId)!;
      }
      
      const step = stepMap.get(templateId);
      if (!step) return 0;
      
      let slack = 0;
      
      if (step.dependencies.length === 0) {
        const goalTime = plan.goalDate.getTime();
        const stepTime = step.dueDateUtc.getTime();
        slack = Math.floor((goalTime - stepTime) / (1000 * 60 * 60 * 24));
      } else {
        let minSlack = Infinity;
        for (const depId of step.dependencies) {
          const depSlack = calculateSlack(depId);
          minSlack = Math.min(minSlack, depSlack);
        }
        slack = minSlack;
      }
      
      slackMap.set(templateId, slack);
      return slack;
    };
    
    for (const step of steps) {
      calculateSlack(step.templateId);
    }
    
    for (const [templateId, slack] of slackMap.entries()) {
      if (slack === 0) {
        criticalPath.push(templateId);
      }
    }
    
    return criticalPath;
  }
}