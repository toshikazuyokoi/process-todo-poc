import { KPICalculator } from './kpi-calculator';
import { Case, StepInstance, User } from '@/app/types';

describe('KPICalculator', () => {
  let calculator: KPICalculator;

  const mockUsers: User[] = [
    { id: 1, name: 'User One', email: 'user1@example.com', role: 'USER' },
    { id: 2, name: 'User Two', email: 'user2@example.com', role: 'USER' },
    { id: 3, name: 'User Three', email: 'user3@example.com', role: 'ADMIN' },
  ];

  const mockStepInstances: StepInstance[] = [
    { id: 1, caseId: 1, templateId: 1, name: 'Step 1', status: 'done', dueDateUtc: '2024-01-15T00:00:00Z', assigneeId: 1, locked: false },
    { id: 2, caseId: 1, templateId: 2, name: 'Step 2', status: 'in_progress', dueDateUtc: '2024-01-20T00:00:00Z', assigneeId: 1, locked: false },
    { id: 3, caseId: 1, templateId: 3, name: 'Step 3', status: 'todo', dueDateUtc: '2024-01-25T00:00:00Z', assigneeId: 2, locked: false },
    { id: 4, caseId: 2, templateId: 1, name: 'Step 4', status: 'done', dueDateUtc: '2024-01-10T00:00:00Z', assigneeId: 2, locked: false },
    { id: 5, caseId: 2, templateId: 2, name: 'Step 5', status: 'done', dueDateUtc: '2024-01-12T00:00:00Z', assigneeId: 3, locked: false },
    { id: 6, caseId: 2, templateId: 3, name: 'Step 6', status: 'blocked', dueDateUtc: '2020-01-01T00:00:00Z', assigneeId: 3, locked: false },
  ];

  const mockCases: Case[] = [
    {
      id: 1,
      processId: 1,
      title: 'Case 1',
      goalDateUtc: '2024-02-01T00:00:00Z',
      status: 'IN_PROGRESS',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      stepInstances: mockStepInstances.filter(s => s.caseId === 1),
    },
    {
      id: 2,
      processId: 1,
      title: 'Case 2',
      goalDateUtc: '2024-01-30T00:00:00Z',
      status: 'COMPLETED',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
      stepInstances: mockStepInstances.filter(s => s.caseId === 2),
    },
  ];

  beforeEach(() => {
    calculator = new KPICalculator();
  });

  describe('KPI Calculation Logic Unit Tests', () => {
    describe('calculateProgressRate', () => {
      it('should calculate correct progress rate for multiple cases', () => {
        const progressRate = calculator.calculateProgressRate(mockCases);
        // Case 1: 1/3 done (33%), Case 2: 2/3 done (67%), Average: 50%
        expect(progressRate).toBe(50);
      });

      it('should return 0 for empty cases array', () => {
        const progressRate = calculator.calculateProgressRate([]);
        expect(progressRate).toBe(0);
      });

      it('should handle cases without step instances', () => {
        const casesWithoutSteps: Case[] = [
          { ...mockCases[0], stepInstances: undefined },
        ];
        const progressRate = calculator.calculateProgressRate(casesWithoutSteps);
        expect(progressRate).toBe(0);
      });
    });

    describe('calculateCaseProgress', () => {
      it('should calculate correct progress for a single case', () => {
        const progress = calculator.calculateCaseProgress(mockCases[0]);
        expect(progress).toBe(33); // 1 out of 3 steps done
      });

      it('should return 0 for case without steps', () => {
        const caseWithoutSteps = { ...mockCases[0], stepInstances: [] };
        const progress = calculator.calculateCaseProgress(caseWithoutSteps);
        expect(progress).toBe(0);
      });

      it('should return 100 for case with all steps done', () => {
        const caseWithAllDone: Case = {
          ...mockCases[0],
          stepInstances: [
            { ...mockStepInstances[0], status: 'done' },
            { ...mockStepInstances[1], status: 'done' },
            { ...mockStepInstances[2], status: 'done' },
          ],
        };
        const progress = calculator.calculateCaseProgress(caseWithAllDone);
        expect(progress).toBe(100);
      });
    });

    describe('calculateOnTimeCompletionRate', () => {
      it('should calculate on-time completion rate correctly', () => {
        const rate = calculator.calculateOnTimeCompletionRate(mockCases);
        expect(rate).toBe(100); // All completed cases are on time
      });

      it('should return 100 when no cases are completed', () => {
        const inProgressCases = mockCases.filter(c => c.status !== 'COMPLETED');
        const rate = calculator.calculateOnTimeCompletionRate(inProgressCases);
        expect(rate).toBe(100);
      });
    });

    describe('calculateResourceUtilization', () => {
      it('should calculate resource utilization correctly', () => {
        const utilization = calculator.calculateResourceUtilization(
          mockStepInstances,
          mockUsers,
          10
        );
        // 3 active tasks (not done) out of 30 capacity (3 users * 10)
        expect(utilization).toBe(10);
      });

      it('should return 0 when no users', () => {
        const utilization = calculator.calculateResourceUtilization(
          mockStepInstances,
          [],
          10
        );
        expect(utilization).toBe(0);
      });

      it('should cap at 100% utilization', () => {
        const utilization = calculator.calculateResourceUtilization(
          mockStepInstances,
          mockUsers,
          1 // Very low capacity
        );
        expect(utilization).toBe(100);
      });
    });

    describe('calculateAverageLeadTime', () => {
      it('should calculate average lead time in days', () => {
        const leadTime = calculator.calculateAverageLeadTime(mockCases);
        // Case 2 is completed: from Jan 1 to Jan 20 = 20 days
        expect(leadTime).toBe(20);
      });

      it('should return 0 when no completed cases', () => {
        const inProgressCases = mockCases.filter(c => c.status !== 'COMPLETED');
        const leadTime = calculator.calculateAverageLeadTime(inProgressCases);
        expect(leadTime).toBe(0);
      });
    });

    describe('countOverdueTasks', () => {
      it('should count overdue tasks correctly', () => {
        const overdue = calculator.countOverdueTasks(mockStepInstances);
        // Step 6 has due date in 2020, which is overdue
        expect(overdue).toBe(1);
      });

      it('should not count completed or cancelled tasks as overdue', () => {
        const steps: StepInstance[] = [
          { ...mockStepInstances[0], dueDateUtc: '2020-01-01T00:00:00Z', status: 'done' },
          { ...mockStepInstances[1], dueDateUtc: '2020-01-01T00:00:00Z', status: 'cancelled' },
        ];
        const overdue = calculator.countOverdueTasks(steps);
        expect(overdue).toBe(0);
      });

      it('should handle tasks without due dates', () => {
        const steps: StepInstance[] = [
          { ...mockStepInstances[0], dueDateUtc: null },
        ];
        const overdue = calculator.countOverdueTasks(steps);
        expect(overdue).toBe(0);
      });
    });

    describe('groupTasksByStatus', () => {
      it('should group tasks by status correctly', () => {
        const grouped = calculator.groupTasksByStatus(mockStepInstances);
        expect(grouped).toEqual({
          todo: 1,
          in_progress: 1,
          done: 3,
          blocked: 1,
          cancelled: 0,
        });
      });

      it('should handle empty array', () => {
        const grouped = calculator.groupTasksByStatus([]);
        expect(grouped).toEqual({
          todo: 0,
          in_progress: 0,
          done: 0,
          blocked: 0,
          cancelled: 0,
        });
      });
    });

    describe('calculateResourceMetrics', () => {
      it('should calculate metrics for each user', () => {
        const metrics = calculator.calculateResourceMetrics(mockStepInstances, mockUsers);
        
        expect(metrics).toHaveLength(3);
        expect(metrics[0]).toEqual({
          userId: 1,
          userName: 'User One',
          assignedTasks: 2,
          completedTasks: 1,
          utilizationRate: 50,
        });
      });

      it('should handle users with no tasks', () => {
        const newUser: User = { id: 99, name: 'New User', email: 'new@example.com', role: 'USER' };
        const metrics = calculator.calculateResourceMetrics(mockStepInstances, [newUser]);
        
        expect(metrics[0]).toEqual({
          userId: 99,
          userName: 'New User',
          assignedTasks: 0,
          completedTasks: 0,
          utilizationRate: 0,
        });
      });
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle division by zero in progress calculation', () => {
      const emptyCase: Case = {
        id: 1,
        processId: 1,
        title: 'Empty Case',
        goalDateUtc: '2024-02-01T00:00:00Z',
        status: 'OPEN',
        stepInstances: [],
      };
      const progress = calculator.calculateCaseProgress(emptyCase);
      expect(progress).toBe(0);
    });

    it('should handle null and undefined values gracefully', () => {
      const caseWithNulls: Case = {
        id: 1,
        processId: 1,
        title: 'Case with nulls',
        goalDateUtc: '2024-02-01T00:00:00Z',
        status: 'OPEN',
        stepInstances: undefined,
      };
      const progress = calculator.calculateCaseProgress(caseWithNulls);
      expect(progress).toBe(0);
    });

    it('should handle very large datasets', () => {
      // Create 1000 step instances
      const largeStepArray: StepInstance[] = [];
      for (let i = 0; i < 1000; i++) {
        largeStepArray.push({
          id: i,
          caseId: 1,
          templateId: 1,
          name: `Step ${i}`,
          status: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'in_progress' : 'todo',
          dueDateUtc: '2024-01-01T00:00:00Z',
          assigneeId: (i % 3) + 1,
          locked: false,
        });
      }

      const startTime = Date.now();
      const grouped = calculator.groupTasksByStatus(largeStepArray);
      const endTime = Date.now();

      // Should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(grouped.done).toBe(334); // ~333 done tasks
    });
  });

  describe('Cache Behavior Tests', () => {
    it('should cache KPI metrics', () => {
      const firstCall = calculator.getKPIMetrics(mockCases, mockUsers, true);
      const secondCall = calculator.getKPIMetrics(mockCases, mockUsers, true);
      
      expect(firstCall).toEqual(secondCall);
    });

    it('should bypass cache when requested', () => {
      const firstCall = calculator.getKPIMetrics(mockCases, mockUsers, false);
      const secondCall = calculator.getKPIMetrics(mockCases, mockUsers, false);
      
      expect(firstCall).toEqual(secondCall);
    });

    it('should clear cache correctly', () => {
      calculator.getKPIMetrics(mockCases, mockUsers, true);
      calculator.clearCache();
      // After clearing, next call should recalculate
      const metrics = calculator.getKPIMetrics(mockCases, mockUsers, true);
      expect(metrics).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle 1000 cases efficiently', () => {
      const largeCaseArray: Case[] = [];
      for (let i = 0; i < 1000; i++) {
        largeCaseArray.push({
          id: i,
          processId: 1,
          title: `Case ${i}`,
          goalDateUtc: '2024-02-01T00:00:00Z',
          status: i % 2 === 0 ? 'COMPLETED' : 'IN_PROGRESS',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          stepInstances: [
            {
              id: i * 3,
              caseId: i,
              templateId: 1,
              name: 'Step 1',
              status: 'done',
              dueDateUtc: '2024-01-15T00:00:00Z',
              assigneeId: 1,
              locked: false,
            },
            {
              id: i * 3 + 1,
              caseId: i,
              templateId: 2,
              name: 'Step 2',
              status: 'in_progress',
              dueDateUtc: '2024-01-20T00:00:00Z',
              assigneeId: 2,
              locked: false,
            },
            {
              id: i * 3 + 2,
              caseId: i,
              templateId: 3,
              name: 'Step 3',
              status: 'todo',
              dueDateUtc: '2024-01-25T00:00:00Z',
              assigneeId: 3,
              locked: false,
            },
          ],
        });
      }

      const startTime = Date.now();
      const metrics = calculator.getKPIMetrics(largeCaseArray, mockUsers, false);
      const endTime = Date.now();

      // Should complete within 500ms
      expect(endTime - startTime).toBeLessThan(500);
      expect(metrics.totalCases).toBe(1000);
      expect(metrics.completedCases).toBe(500);
    });
  });
});