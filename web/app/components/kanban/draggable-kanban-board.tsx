'use client';

import React, { useMemo, useState } from 'react';
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
import { StepInstance, User } from '@/app/types';

export interface KanbanColumn {
  id: string;
  title: string;
  status: StepInstance['status'];
  color: string;
}

export interface DraggableKanbanBoardProps {
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

export const DraggableKanbanBoard: React.FC<DraggableKanbanBoardProps> = ({
  stepInstances,
  users = [],
  onStatusChange,
  onColumnSettingsChange,
}) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Configure sensors for drag handling
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

  // Group steps by status
  const stepsByStatus = useMemo(() => {
    const grouped: Record<string, StepInstance[]> = {};
    columns.forEach((col) => {
      grouped[col.status] = [];
    });
    
    stepInstances.forEach((step) => {
      if (grouped[step.status]) {
        grouped[step.status].push(step);
      }
    });
    
    return grouped;
  }, [stepInstances, columns]);

  // Get user by ID
  const getUserById = (userId?: number | null) => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  };

  // Find the active step being dragged
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
    
    // Check if we're over a column (droppable)
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn && activeStep.status !== overColumn.status) {
      // Optimistically update the UI
      onStatusChange?.(activeStep.id!, overColumn.status);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const activeStep = stepInstances.find(s => s.id === active.id);
    if (!activeStep) return;
    
    // Find the target column
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn && activeStep.status !== overColumn.status) {
      // Update status through the parent handler
      onStatusChange?.(activeStep.id!, overColumn.status);
    }
  };

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
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-4">
          <h2 className="text-xl font-semibold">Kanban Board</h2>
          <button
            onClick={() => setIsEditingColumns(!isEditingColumns)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            aria-label="Toggle column settings"
          >
            {isEditingColumns ? 'Done' : 'Edit Columns'}
          </button>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full min-w-max px-4 pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className={`flex flex-col w-80 ${column.color} rounded-lg`}
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
                        {stepsByStatus[column.status]?.length || 0}
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
                </div>

                {/* Column content with droppable area */}
                <div
                  id={column.id}
                  className="flex-1 p-3 overflow-y-auto"
                  data-column-status={column.status}
                >
                  <SortableContext
                    items={stepsByStatus[column.status]?.map(s => s.id!) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[100px]">
                      {stepsByStatus[column.status]?.map((step) => (
                        <KanbanCard
                          key={step.id}
                          step={step}
                          assignee={getUserById(step.assigneeId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            ))}

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