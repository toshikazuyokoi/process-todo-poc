import { Injectable } from '@nestjs/common';
import { OptimizedCaseRepository } from '../optimized/case.repository.optimized';
import { CacheService } from '../../../common/services/cache.service';
import { Case } from '../../../domain/entities/case';
import { CaseStatus } from '../../../domain/value-objects/case-status';
import { ICaseRepository } from '../../../domain/repositories/case.repository.interface';

@Injectable()
export class CachedCaseRepository implements ICaseRepository {
  constructor(
    private readonly repository: OptimizedCaseRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findById(id: number): Promise<Case | null> {
    const key = `case:${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findById(id),
      { ttl: 300, tags: ['case', `case:${id}`] }, // 5 minutes
    );
  }

  async findAll(status?: CaseStatus): Promise<Case[]> {
    const key = status ? `cases:status:${status}` : 'cases:all';
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findAll(status),
      { ttl: 60, tags: ['cases'] }, // 1 minute
    );
  }

  async findForDashboard(userId?: number): Promise<any[]> {
    const key = userId ? `dashboard:user:${userId}` : 'dashboard:all';
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findForDashboard(userId),
      { ttl: 30, tags: ['dashboard'] }, // 30 seconds
    );
  }

  async findForGantt(startDate: Date, endDate: Date): Promise<any[]> {
    const key = `gantt:${startDate.toISOString()}:${endDate.toISOString()}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findForGantt(startDate, endDate),
      { ttl: 120, tags: ['gantt'] }, // 2 minutes
    );
  }

  async findByIdsWithRelations(ids: number[]): Promise<Case[]> {
    // バッチ処理はキャッシュしない（データ量が多い可能性があるため）
    return this.repository.findByIdsWithRelations(ids);
  }

  async findByProcessId(processId: number): Promise<Case[]> {
    const key = `cases:process:${processId}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findByProcessId(processId),
      { ttl: 180, tags: ['cases', `process:${processId}`] }, // 3 minutes
    );
  }

  async findByUserId(userId: number): Promise<Case[]> {
    const key = `cases:user:${userId}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findByUserId(userId),
      { ttl: 120, tags: ['cases', `user:${userId}`] }, // 2 minutes
    );
  }

  async save(caseEntity: Case): Promise<Case> {
    const result = await this.repository.save(caseEntity);
    
    // キャッシュ無効化
    const id = result.getId();
    if (id) {
      await this.cacheService.delete(`case:${id}`);
      await this.cacheService.invalidateTag('cases');
      await this.cacheService.invalidateTag('dashboard');
      await this.cacheService.invalidateTag('gantt');
      await this.cacheService.invalidateTag(`user:${result.getCreatedBy()}`);
      await this.cacheService.invalidateTag(`process:${result.getProcessId()}`);
    }
    
    return result;
  }

  async delete(id: number): Promise<void> {
    // 削除前にケース情報を取得（キャッシュ無効化のため）
    const caseEntity = await this.repository.findById(id);
    
    await this.repository.delete(id);
    
    // キャッシュ無効化
    await this.cacheService.delete(`case:${id}`);
    await this.cacheService.invalidateTag('cases');
    await this.cacheService.invalidateTag('dashboard');
    await this.cacheService.invalidateTag('gantt');
    
    if (caseEntity) {
      await this.cacheService.invalidateTag(`user:${caseEntity.getCreatedBy()}`);
      await this.cacheService.invalidateTag(`process:${caseEntity.getProcessId()}`);
    }
  }

  async findWithStepInstances(id: number): Promise<Case | null> {
    const key = `case:withSteps:${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findWithStepInstances(id),
      { ttl: 180, tags: ['case', `case:${id}`] }, // 3 minutes
    );
  }

  async findUpcomingCases(days: number): Promise<Case[]> {
    const key = `cases:upcoming:${days}`;
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findUpcomingCases(days),
      { ttl: 300, tags: ['cases', 'upcoming'] }, // 5 minutes
    );
  }

  async findOverdue(): Promise<Case[]> {
    const key = 'cases:overdue';
    return this.cacheService.getOrSet(
      key,
      () => this.repository.findOverdue(),
      { ttl: 300, tags: ['cases', 'overdue'] }, // 5 minutes
    );
  }
}