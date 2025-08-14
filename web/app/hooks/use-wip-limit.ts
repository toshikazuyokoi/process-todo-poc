import { useState, useEffect, useCallback } from 'react';
import { StepInstance } from '@/app/types';

export interface WipLimit {
  [columnId: string]: number;
}

export interface WipLimitConfig {
  limits: WipLimit;
  enabled: boolean;
}

const DEFAULT_WIP_LIMITS: WipLimit = {
  'todo': 10,
  'in_progress': 3,
  'blocked': 5,
  'done': 999, // Effectively unlimited
};

const LOCAL_STORAGE_KEY = 'kanban-wip-limits';

export function useWipLimit() {
  const [config, setConfig] = useState<WipLimitConfig>({
    limits: DEFAULT_WIP_LIMITS,
    enabled: true,
  });

  // Load WIP limits from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({
          limits: { ...DEFAULT_WIP_LIMITS, ...parsed.limits },
          enabled: parsed.enabled ?? true,
        });
      } catch (error) {
        console.error('Failed to parse WIP limits from localStorage:', error);
      }
    }
  }, []);

  // Save WIP limits to localStorage whenever they change
  const updateConfig = useCallback((newConfig: Partial<WipLimitConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Set WIP limit for a specific column
  const setWipLimit = useCallback((columnId: string, limit: number) => {
    if (limit < 0) return; // Prevent negative limits
    
    updateConfig({
      limits: {
        ...config.limits,
        [columnId]: limit,
      },
    });
  }, [config.limits, updateConfig]);

  // Toggle WIP limits on/off
  const toggleWipLimits = useCallback(() => {
    updateConfig({ enabled: !config.enabled });
  }, [config.enabled, updateConfig]);

  // Check if a column has reached its WIP limit
  const isAtLimit = useCallback((columnId: string, currentCount: number): boolean => {
    if (!config.enabled) return false;
    
    const limit = config.limits[columnId];
    if (!limit) return false;
    
    return currentCount >= limit;
  }, [config]);

  // Check if a column would exceed its limit with additional items
  const wouldExceedLimit = useCallback((
    columnId: string,
    currentCount: number,
    additionalItems: number = 1
  ): boolean => {
    if (!config.enabled) return false;
    
    const limit = config.limits[columnId];
    if (!limit) return false;
    
    return (currentCount + additionalItems) > limit;
  }, [config]);

  // Get warning message for a column
  const getWarningMessage = useCallback((columnId: string, currentCount: number): string | null => {
    if (!config.enabled) return null;
    
    const limit = config.limits[columnId];
    if (!limit) return null;
    
    if (currentCount >= limit) {
      return `WIP limit reached (${currentCount}/${limit})`;
    }
    
    if (currentCount === limit - 1) {
      return `Near WIP limit (${currentCount}/${limit})`;
    }
    
    return null;
  }, [config]);

  // Check if a drop is allowed based on WIP limits
  const canDropToColumn = useCallback((
    targetColumnId: string,
    currentColumnId: string,
    stepsByStatus: Record<string, StepInstance[]>
  ): { allowed: boolean; reason?: string } => {
    if (!config.enabled) return { allowed: true };
    
    // Moving within the same column is always allowed
    if (targetColumnId === currentColumnId) {
      return { allowed: true };
    }
    
    const targetColumnSteps = stepsByStatus[targetColumnId] || [];
    const currentCount = targetColumnSteps.length;
    
    if (wouldExceedLimit(targetColumnId, currentCount)) {
      const limit = config.limits[targetColumnId];
      return {
        allowed: false,
        reason: `Cannot move: WIP limit would be exceeded (${currentCount + 1}/${limit})`,
      };
    }
    
    return { allowed: true };
  }, [config, wouldExceedLimit]);

  // Get limit status for display
  const getLimitStatus = useCallback((columnId: string, currentCount: number): {
    percentage: number;
    color: string;
    showWarning: boolean;
  } => {
    const limit = config.limits[columnId];
    if (!limit || !config.enabled) {
      return {
        percentage: 0,
        color: 'green',
        showWarning: false,
      };
    }
    
    const percentage = (currentCount / limit) * 100;
    
    if (percentage >= 100) {
      return {
        percentage: 100,
        color: 'red',
        showWarning: true,
      };
    }
    
    if (percentage >= 80) {
      return {
        percentage,
        color: 'yellow',
        showWarning: true,
      };
    }
    
    return {
      percentage,
      color: 'green',
      showWarning: false,
    };
  }, [config]);

  return {
    config,
    setWipLimit,
    toggleWipLimits,
    isAtLimit,
    wouldExceedLimit,
    getWarningMessage,
    canDropToColumn,
    getLimitStatus,
  };
}