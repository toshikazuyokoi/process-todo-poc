'use client';

import React, { useMemo, useState, useCallback, Suspense } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import { KanbanFilter, FilterOptions } from './kanban-filter';
import { StepInstance, User } from '@/app/types';
import { useWipLimit } from '@/app/hooks/use-wip-limit';
import { AlertTriangle, Settings } from 'lucide-react';
import { toast } from '@/app/components/ui/toast';

export interface KanbanColumn {
  id: string;
  title: string;
  status: StepInstance['status'];
  color: string;
}

export interface KanbanBoardCompleteProps {
  stepInstances: StepInstance[];
  users?: User[];
  onStatusChange?: (stepId: number, newStatus: StepInstance['status']) => void;
  onColumnSettingsChange?: (columns: KanbanColumn[]) => void;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'bg-blue-100' },
  { id: 'blocked', title: 'Blocked', status: 'blocked', color: 'bg-red-100' },
  { id: 'done', title: 'Done', status: 'done', color: 'bg-green-100' },
];

export const KanbanBoardComplete: React.FC<KanbanBoardCompleteProps> = ({
  stepInstances,
  users = [],
  onStatusChange,
  onColumnSettingsChange,
}) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [isEditingWipLimits, setIsEditingWipLimits] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    assignees: [],
    priority: [],
    dueDate: null,
  });

  const {
    config,
    setWipLimit,
    toggleWipLimits,
    getWarningMessage,
    canDropToColumn,
    getLimitStatus,
  } = useWipLimit();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  // Filter step instances based on active filters
  const filteredStepInstances = useMemo(() => {
    let filtered = [...stepInstances];

    // Filter by assignees
    if (filters.assignees.length > 0) {
      filtered = filtered.filter(step => {
        if (filters.assignees.includes(-1) && !step.assigneeId) {
          return true; // Include unassigned
        }
        return step.assigneeId && filters.assignees.includes(step.assigneeId);
      });
    }

    // Filter by priority
    if (filters.priority.length > 0) {
      filtered = filtered.filter(step => {
        if (!step.dueDateUtc) {
          return filters.priority.includes('no-date');
        }
        
        const dueDate = new Date(step.dueDateUtc);
        const today = new Date();
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let priority = 'low';
        if (daysUntilDue < 0) priority = 'overdue';
        else if (daysUntilDue <= 3) priority = 'high';
        else if (daysUntilDue <= 7) priority = 'medium';
        
        return filters.priority.includes(priority);
      });
    }

    // Filter by due date
    if (filters.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(step => {
        if (!step.dueDateUtc) {
          return filters.dueDate === 'no-date';
        }
        
        const dueDate = new Date(step.dueDateUtc);
        dueDate.setHours(0, 0, 0, 0);
        
        switch (filters.dueDate) {
          case 'overdue':
            return dueDate < today;
          case 'today':
            return dueDate.getTime() === today.getTime();
          case 'week': {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            return dueDate >= today && dueDate <= weekEnd;
          }
          case 'month': {
            const monthEnd = new Date(today);
            monthEnd.setMonth(today.getMonth() + 1);
            return dueDate >= today && dueDate <= monthEnd;
          }
          case 'no-date':
            return false;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [stepInstances, filters]);

  const stepsByStatus = useMemo(() => {
    const grouped: Record<string, StepInstance[]> = {};
    columns.forEach((col) => {
      grouped[col.status] = [];
    });
    
    filteredStepInstances.forEach((step) => {
      if (grouped[step.status]) {
        grouped[step.status].push(step);
      }
    });
    
    return grouped;
  }, [filteredStepInstances, columns]);

  const getUserById = (userId?: number | null) => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  };

  const activeStep = useMemo(
    () => stepInstances.find((step) => step.id === activeId),
    [activeId, stepInstances]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeStep = stepInstances.find(s => s.id === active.id);
    if (!activeStep) return;
    
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn && activeStep.status !== overColumn.status) {
      const dropCheck = canDropToColumn(overColumn.status, activeStep.status, stepsByStatus);
      if (!dropCheck.allowed) {
        return;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const activeStep = stepInstances.find(s => s.id === active.id);
    if (!activeStep) return;
    
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn && activeStep.status !== overColumn.status) {
      const dropCheck = canDropToColumn(overColumn.status, activeStep.status, stepsByStatus);
      
      if (!dropCheck.allowed) {
        toast.error(dropCheck.reason || 'Cannot move: WIP limit exceeded');
        return;
      }
      
      onStatusChange?.(activeStep.id!, overColumn.status);
      toast.success('Card moved successfully');
    }
  };

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const handleAddColumn = () => {
    const newColumn: KanbanColumn = {
      id: `custom_${Date.now()}`,
      title: 'New Column',
      status: 'todo',
      color: 'bg-gray-100',
    };
    const newColumns = [...columns, newColumn];
    setColumns(newColumns);
    onColumnSettingsChange?.(newColumns);
  };

  const handleRemoveColumn = (columnId: string) => {
    if (columns.length <= 1) return;
    const newColumns = columns.filter((col) => col.id !== columnId);
    setColumns(newColumns);
    onColumnSettingsChange?.(newColumns);
  };

  const handleRenameColumn = (columnId: string, newTitle: string) => {
    const newColumns = columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );
    setColumns(newColumns);
    onColumnSettingsChange?.(newColumns);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Header with filters */}
        <div className="flex justify-between items-center mb-4 px-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Kanban Board</h2>
            <Suspense fallback={<div className="text-gray-500 text-sm">フィルター読み込み中...</div>}>
              <KanbanFilter
                users={users}
                onFilterChange={handleFilterChange}
              />
            </Suspense>
          </div>
          <div className="flex gap-2">
            {/* WIP Limits Toggle */}
            <button
              onClick={toggleWipLimits}
              className={`px-3 py-1 text-sm border rounded flex items-center gap-1 ${
                config.enabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
              }`}
              aria-label="Toggle WIP limits"
            >
              <AlertTriangle className="w-4 h-4" />
              WIP: {config.enabled ? 'ON' : 'OFF'}
            </button>
            
            {/* WIP Settings */}
            {config.enabled && (
              <button
                onClick={() => setIsEditingWipLimits(!isEditingWipLimits)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                aria-label="Configure WIP limits"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            
            {/* Column Settings */}
            <button
              onClick={() => setIsEditingColumns(!isEditingColumns)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              aria-label="Toggle column settings"
            >
              {isEditingColumns ? 'Done' : 'Edit Columns'}
            </button>
          </div>
        </div>

        {/* Filter status bar */}
        {(filters.assignees.length > 0 || filters.priority.length > 0 || filters.dueDate) && (
          <div className="px-4 pb-2">
            <div className="text-sm text-gray-600">
              Showing {filteredStepInstances.length} of {stepInstances.length} items
            </div>
          </div>
        )}

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full min-w-max px-4 pb-4">
            {columns.map((column) => {
              const columnSteps = stepsByStatus[column.status] || [];
              const warningMessage = getWarningMessage(column.status, columnSteps.length);
              const limitStatus = getLimitStatus(column.status, columnSteps.length);
              
              return (
                <div
                  key={column.id}
                  className={`flex flex-col w-80 ${column.color} rounded-lg ${
                    limitStatus.showWarning ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  {/* Column header */}
                  <div className="p-3 border-b bg-white bg-opacity-50">
                    <div className="flex justify-between items-center">
                      {isEditingColumns ? (
                        <input
                          type="text"
                          value={column.title}
                          onChange={(e) => handleRenameColumn(column.id, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm font-semibold bg-transparent border-b border-gray-400 focus:outline-none"
                          aria-label={`Edit column title: ${column.title}`}
                        />
                      ) : (
                        <h3 className="font-semibold">{column.title}</h3>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {columnSteps.length}
                          {config.enabled && config.limits[column.status] && (
                            <span className="text-gray-400">
                              /{config.limits[column.status]}
                            </span>
                          )}
                        </span>
                        {isEditingColumns && columns.length > 1 && (
                          <button
                            onClick={() => handleRemoveColumn(column.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            aria-label={`Remove column: ${column.title}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* WIP Limit Configuration */}
                    {isEditingWipLimits && config.enabled && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-gray-600">WIP Limit:</label>
                        <input
                          type="number"
                          min="1"
                          value={config.limits[column.status] || 0}
                          onChange={(e) => setWipLimit(column.status, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs border rounded"
                          aria-label={`Set WIP limit for ${column.title}`}
                        />
                      </div>
                    )}
                    
                    {/* WIP Warning */}
                    {warningMessage && config.enabled && (
                      <div className={`mt-2 text-xs ${
                        limitStatus.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {warningMessage}
                      </div>
                    )}
                    
                    {/* WIP Progress Bar */}
                    {config.enabled && config.limits[column.status] && (
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            limitStatus.color === 'red' ? 'bg-red-500' :
                            limitStatus.color === 'yellow' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(limitStatus.percentage, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Column content */}
                  <div
                    id={column.id}
                    className="flex-1 p-3 overflow-y-auto"
                    data-column-status={column.status}
                  >
                    <SortableContext
                      items={columnSteps.map(s => s.id!)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 min-h-[100px]">
                        {columnSteps.map((step) => (
                          <KanbanCard
                            key={step.id}
                            step={step}
                            assignee={getUserById(step.assigneeId)}
                          />
                        ))}
                        {columnSteps.length === 0 && (
                          <div className="text-center text-gray-400 text-sm py-8">
                            No items
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}

            {/* Add column button */}
            {isEditingColumns && (
              <button
                onClick={handleAddColumn}
                className="flex items-center justify-center w-80 h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                aria-label="Add new column"
              >
                <span className="text-gray-500">+ Add Column</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeStep ? (
          <KanbanCard
            step={activeStep}
            assignee={getUserById(activeStep.assigneeId)}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};