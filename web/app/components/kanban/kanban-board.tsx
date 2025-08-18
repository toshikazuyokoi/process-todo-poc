'use client';

import React, { useMemo, useState } from 'react';
import { StepInstance } from '@/app/types';
import { formatDateJP } from '@/app/utils/date-formatter';

export interface KanbanColumn {
  id: string;
  title: string;
  status: StepInstance['status'];
  color: string;
}

export interface KanbanBoardProps {
  stepInstances: StepInstance[];
  onStatusChange?: (stepId: number, newStatus: StepInstance['status']) => void;
  onColumnSettingsChange?: (columns: KanbanColumn[]) => void;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'bg-blue-100' },
  { id: 'blocked', title: 'Blocked', status: 'blocked', color: 'bg-red-100' },
  { id: 'done', title: 'Done', status: 'done', color: 'bg-green-100' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stepInstances,
  onStatusChange,
  onColumnSettingsChange,
}) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [isEditingColumns, setIsEditingColumns] = useState(false);

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
    if (columns.length <= 1) return; // Keep at least one column
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
    <div className="h-full flex flex-col">
      {/* Header with column settings */}
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

      {/* Kanban columns container with horizontal scroll */}
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

              {/* Column content - cards will be added in next task */}
              <div className="flex-1 p-3 overflow-y-auto">
                <div className="space-y-2">
                  {stepsByStatus[column.status]?.map((step) => (
                    <div
                      key={step.id}
                      className="p-3 bg-white rounded shadow-sm border"
                    >
                      {/* Basic card display - will be enhanced in task 2.2 */}
                      <div className="text-sm font-medium">{step.name}</div>
                      {step.dueDateUtc && (
                        <div className="text-xs text-gray-500 mt-1" data-testid={`due-date-${step.id}`}>
                          Due: {formatDateJP(step.dueDateUtc)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
  );
};