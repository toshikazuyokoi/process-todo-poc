import { Case, StepInstance, User } from '@/app/types';

export interface KPIMetrics {
  progressRate: number;
  onTimeCompletionRate: number;
  resourceUtilization: number;
  averageLeadTime: number;
  totalCases: number;
  completedCases: number;
  overdueTasks: number;
  tasksByStatus: Record<string, number>;
}

export interface ResourceMetrics {
  userId: number;
  userName: string;
  assignedTasks: number;
  completedTasks: number;
  utilizationRate: number;
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class KPICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL = 60000; // 1 minute cache

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class KPICalculator {
  private cache = new KPICache();

  /**
   * Calculate overall progress rate across all cases
   */
  calculateProgressRate(cases: Case[]): number {
    if (cases.length === 0) return 0;
    
    const totalProgress = cases.reduce((sum, caseItem) => {
      const caseProgress = this.calculateCaseProgress(caseItem);
      return sum + caseProgress;
    }, 0);
    
    return Math.round(totalProgress / cases.length);
  }

  /**
   * Calculate progress for a single case
   */
  calculateCaseProgress(caseItem: Case): number {
    if (!caseItem.stepInstances || caseItem.stepInstances.length === 0) {
      return 0;
    }
    
    const completedSteps = caseItem.stepInstances.filter(
      step => step.status === 'done'
    ).length;
    
    return Math.round((completedSteps / caseItem.stepInstances.length) * 100);
  }

  /**
   * Calculate on-time completion rate
   */
  calculateOnTimeCompletionRate(cases: Case[]): number {
    const completedCases = cases.filter(c => c.status === 'COMPLETED');
    if (completedCases.length === 0) return 100; // No completed cases yet
    
    const onTimeCases = completedCases.filter(caseItem => {
      // Check if all steps were completed before their due dates
      if (!caseItem.stepInstances) return true;
      
      return caseItem.stepInstances.every(step => {
        if (step.status !== 'done') return true;
        if (!step.dueDateUtc) return true;
        
        // For this example, we assume completion date is current date
        // In production, you'd track actual completion dates
        const dueDate = new Date(step.dueDateUtc);
        const now = new Date();
        return now <= dueDate;
      });
    });
    
    return Math.round((onTimeCases.length / completedCases.length) * 100);
  }

  /**
   * Calculate resource utilization rate
   */
  calculateResourceUtilization(
    stepInstances: StepInstance[],
    users: User[],
    capacityPerUser: number = 10
  ): number {
    if (users.length === 0) return 0;
    
    const assignedTasksByUser = new Map<number, number>();
    
    stepInstances.forEach(step => {
      if (step.assigneeId && step.status !== 'done') {
        const count = assignedTasksByUser.get(step.assigneeId) || 0;
        assignedTasksByUser.set(step.assigneeId, count + 1);
      }
    });
    
    const totalCapacity = users.length * capacityPerUser;
    const totalAssigned = Array.from(assignedTasksByUser.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    
    return Math.min(Math.round((totalAssigned / totalCapacity) * 100), 100);
  }

  /**
   * Calculate average lead time in days
   */
  calculateAverageLeadTime(cases: Case[]): number {
    const completedCases = cases.filter(c => c.status === 'COMPLETED');
    if (completedCases.length === 0) return 0;
    
    const leadTimes = completedCases.map(caseItem => {
      const createdDate = new Date(caseItem.createdAt || Date.now());
      const completedDate = new Date(caseItem.updatedAt || Date.now());
      const diffTime = Math.abs(completedDate.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    });
    
    const totalLeadTime = leadTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(totalLeadTime / leadTimes.length);
  }

  /**
   * Count overdue tasks
   */
  countOverdueTasks(stepInstances: StepInstance[]): number {
    const now = new Date();
    
    return stepInstances.filter(step => {
      if (step.status === 'done' || step.status === 'cancelled') return false;
      if (!step.dueDateUtc) return false;
      
      const dueDate = new Date(step.dueDateUtc);
      return dueDate < now;
    }).length;
  }

  /**
   * Group tasks by status
   */
  groupTasksByStatus(stepInstances: StepInstance[]): Record<string, number> {
    const statusCounts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      cancelled: 0,
    };
    
    stepInstances.forEach(step => {
      if (statusCounts[step.status] !== undefined) {
        statusCounts[step.status]++;
      }
    });
    
    return statusCounts;
  }

  /**
   * Calculate resource-specific metrics
   */
  calculateResourceMetrics(
    stepInstances: StepInstance[],
    users: User[]
  ): ResourceMetrics[] {
    return users.map(user => {
      const userTasks = stepInstances.filter(
        step => step.assigneeId === user.id
      );
      
      const completedTasks = userTasks.filter(
        step => step.status === 'done'
      ).length;
      
      const utilizationRate = userTasks.length > 0
        ? Math.round((completedTasks / userTasks.length) * 100)
        : 0;
      
      return {
        userId: user.id,
        userName: user.name,
        assignedTasks: userTasks.length,
        completedTasks,
        utilizationRate,
      };
    });
  }

  /**
   * Get comprehensive KPI metrics with caching
   */
  getKPIMetrics(
    cases: Case[],
    users: User[],
    useCache: boolean = true
  ): KPIMetrics {
    const cacheKey = 'kpi_metrics';
    
    if (useCache) {
      const cached = this.cache.get<KPIMetrics>(cacheKey);
      if (cached) return cached;
    }
    
    // Collect all step instances
    const allStepInstances: StepInstance[] = [];
    cases.forEach(caseItem => {
      if (caseItem.stepInstances) {
        allStepInstances.push(...caseItem.stepInstances);
      }
    });
    
    const metrics: KPIMetrics = {
      progressRate: this.calculateProgressRate(cases),
      onTimeCompletionRate: this.calculateOnTimeCompletionRate(cases),
      resourceUtilization: this.calculateResourceUtilization(allStepInstances, users),
      averageLeadTime: this.calculateAverageLeadTime(cases),
      totalCases: cases.length,
      completedCases: cases.filter(c => c.status === 'COMPLETED').length,
      overdueTasks: this.countOverdueTasks(allStepInstances),
      tasksByStatus: this.groupTasksByStatus(allStepInstances),
    };
    
    if (useCache) {
      this.cache.set(cacheKey, metrics);
    }
    
    return metrics;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}