import { renderHook, act } from '@testing-library/react';
import { useWipLimit } from './use-wip-limit';
import { StepInstance } from '@/app/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useWipLimit', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Limit Value Check Logic', () => {
    it('should initialize with default WIP limits', () => {
      const { result } = renderHook(() => useWipLimit());
      
      expect(result.current.config.limits).toEqual({
        'todo': 10,
        'in_progress': 3,
        'blocked': 5,
        'done': 999,
      });
      expect(result.current.config.enabled).toBe(true);
    });

    it('should check if column is at limit', () => {
      const { result } = renderHook(() => useWipLimit());
      
      // Test with in_progress column (limit: 3)
      expect(result.current.isAtLimit('in_progress', 2)).toBe(false);
      expect(result.current.isAtLimit('in_progress', 3)).toBe(true);
      expect(result.current.isAtLimit('in_progress', 4)).toBe(true);
    });

    it('should check if column would exceed limit', () => {
      const { result } = renderHook(() => useWipLimit());
      
      // Test with in_progress column (limit: 3)
      expect(result.current.wouldExceedLimit('in_progress', 2, 1)).toBe(false);
      expect(result.current.wouldExceedLimit('in_progress', 2, 2)).toBe(true);
      expect(result.current.wouldExceedLimit('in_progress', 3, 1)).toBe(true);
    });

    it('should return false when WIP limits are disabled', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.toggleWipLimits();
      });
      
      expect(result.current.config.enabled).toBe(false);
      expect(result.current.isAtLimit('in_progress', 5)).toBe(false);
      expect(result.current.wouldExceedLimit('in_progress', 5, 1)).toBe(false);
    });
  });

  describe('Warning Display Conditions', () => {
    it('should return warning message when at limit', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const warning = result.current.getWarningMessage('in_progress', 3);
      expect(warning).toBe('WIP limit reached (3/3)');
    });

    it('should return warning message when near limit', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const warning = result.current.getWarningMessage('in_progress', 2);
      expect(warning).toBe('Near WIP limit (2/3)');
    });

    it('should return null when below limit threshold', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const warning = result.current.getWarningMessage('in_progress', 1);
      expect(warning).toBeNull();
    });

    it('should return null when WIP limits are disabled', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.toggleWipLimits();
      });
      
      const warning = result.current.getWarningMessage('in_progress', 5);
      expect(warning).toBeNull();
    });
  });

  describe('Drop Permission Tests', () => {
    const mockStepsByStatus: Record<string, StepInstance[]> = {
      'todo': [
        { id: 1, caseId: 1, templateId: 1, name: 'Task 1', dueDateUtc: null, status: 'todo', locked: false },
      ],
      'in_progress': [
        { id: 2, caseId: 1, templateId: 2, name: 'Task 2', dueDateUtc: null, status: 'in_progress', locked: false },
        { id: 3, caseId: 1, templateId: 3, name: 'Task 3', dueDateUtc: null, status: 'in_progress', locked: false },
      ],
      'blocked': [],
      'done': [],
    };

    it('should allow drop when within limit', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const canDrop = result.current.canDropToColumn('in_progress', 'todo', mockStepsByStatus);
      expect(canDrop.allowed).toBe(true);
      expect(canDrop.reason).toBeUndefined();
    });

    it('should deny drop when limit would be exceeded', () => {
      const { result } = renderHook(() => useWipLimit());
      
      // in_progress already has 2 items, limit is 3
      const updatedStatus = {
        ...mockStepsByStatus,
        'in_progress': [
          ...mockStepsByStatus['in_progress'],
          { id: 4, caseId: 1, templateId: 4, name: 'Task 4', dueDateUtc: null, status: 'in_progress', locked: false },
        ],
      };
      
      const canDrop = result.current.canDropToColumn('in_progress', 'todo', updatedStatus);
      expect(canDrop.allowed).toBe(false);
      expect(canDrop.reason).toBe('Cannot move: WIP limit would be exceeded (4/3)');
    });

    it('should always allow moving within the same column', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const canDrop = result.current.canDropToColumn('in_progress', 'in_progress', mockStepsByStatus);
      expect(canDrop.allowed).toBe(true);
      expect(canDrop.reason).toBeUndefined();
    });

    it('should allow all drops when WIP limits are disabled', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.toggleWipLimits();
      });
      
      const fullStatus = {
        'in_progress': Array(10).fill(null).map((_, i) => ({
          id: i,
          caseId: 1,
          templateId: i,
          name: `Task ${i}`,
          dueDateUtc: null,
          status: 'in_progress' as const,
          locked: false,
        })),
      };
      
      const canDrop = result.current.canDropToColumn('in_progress', 'todo', fullStatus);
      expect(canDrop.allowed).toBe(true);
    });
  });

  describe('WIP Limit Configuration', () => {
    it('should update WIP limit for a column', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.setWipLimit('in_progress', 5);
      });
      
      expect(result.current.config.limits['in_progress']).toBe(5);
    });

    it('should not allow negative WIP limits', () => {
      const { result } = renderHook(() => useWipLimit());
      
      const initialLimit = result.current.config.limits['in_progress'];
      
      act(() => {
        result.current.setWipLimit('in_progress', -1);
      });
      
      expect(result.current.config.limits['in_progress']).toBe(initialLimit);
    });

    it('should persist WIP limits to localStorage', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.setWipLimit('in_progress', 5);
      });
      
      const saved = JSON.parse(localStorageMock.getItem('kanban-wip-limits') || '{}');
      expect(saved.limits['in_progress']).toBe(5);
    });

    it('should load WIP limits from localStorage on mount', () => {
      const savedConfig = {
        limits: { 'in_progress': 7 },
        enabled: false,
      };
      localStorageMock.setItem('kanban-wip-limits', JSON.stringify(savedConfig));
      
      const { result } = renderHook(() => useWipLimit());
      
      expect(result.current.config.limits['in_progress']).toBe(7);
      expect(result.current.config.enabled).toBe(false);
    });
  });

  describe('Limit Status Display', () => {
    it('should calculate correct percentage and color for limit status', () => {
      const { result } = renderHook(() => useWipLimit());
      
      // Test different percentages (in_progress limit is 3)
      let status = result.current.getLimitStatus('in_progress', 0);
      expect(status.percentage).toBe(0);
      expect(status.color).toBe('green');
      expect(status.showWarning).toBe(false);
      
      status = result.current.getLimitStatus('in_progress', 2);
      expect(status.percentage).toBeCloseTo(66.67, 1);
      expect(status.color).toBe('green');
      expect(status.showWarning).toBe(false);
      
      status = result.current.getLimitStatus('in_progress', 3);
      expect(status.percentage).toBe(100);
      expect(status.color).toBe('red');
      expect(status.showWarning).toBe(true);
    });

    it('should show yellow warning at 80% capacity', () => {
      const { result } = renderHook(() => useWipLimit());
      
      // Set limit to 10 for easier calculation
      act(() => {
        result.current.setWipLimit('todo', 10);
      });
      
      const status = result.current.getLimitStatus('todo', 8);
      expect(status.percentage).toBe(80);
      expect(status.color).toBe('yellow');
      expect(status.showWarning).toBe(true);
    });

    it('should return default status when WIP limits are disabled', () => {
      const { result } = renderHook(() => useWipLimit());
      
      act(() => {
        result.current.toggleWipLimits();
      });
      
      const status = result.current.getLimitStatus('in_progress', 5);
      expect(status.percentage).toBe(0);
      expect(status.color).toBe('green');
      expect(status.showWarning).toBe(false);
    });
  });
});