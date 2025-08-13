'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepInstance, User } from '@/app/types';
import { Calendar, User as UserIcon, AlertCircle } from 'lucide-react';

export interface KanbanCardProps {
  step: StepInstance;
  assignee?: User;
  isDragging?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  step,
  assignee,
  isDragging = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: step.id!,
    data: {
      type: 'StepInstance',
      step,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // Calculate priority based on due date
  const getPriority = () => {
    if (!step.dueDateUtc) return 'none';
    
    const dueDate = new Date(step.dueDateUtc);
    const today = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  };

  const priority = getPriority();
  const priorityColors = {
    overdue: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50',
    none: 'border-gray-300 bg-white',
  };

  const priorityLabels = {
    overdue: '期限切れ',
    high: '高',
    medium: '中',
    low: '低',
    none: '',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-3 rounded-lg shadow-sm border-l-4 cursor-move
        transition-all duration-200 hover:shadow-md
        ${priorityColors[priority]}
        ${isSortableDragging ? 'rotate-2 scale-105' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-gray-800 flex-1 pr-2">
          {step.name}
        </h4>
        {step.locked && (
          <AlertCircle className="w-4 h-4 text-amber-500" title="Locked" />
        )}
      </div>

      {/* Card Meta Information */}
      <div className="space-y-1">
        {/* Due Date */}
        {step.dueDateUtc && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{new Date(step.dueDateUtc).toLocaleDateString('ja-JP')}</span>
            {priority !== 'none' && priority !== 'low' && (
              <span className={`
                ml-auto px-1.5 py-0.5 rounded text-xs font-medium
                ${priority === 'overdue' ? 'bg-red-500 text-white' : ''}
                ${priority === 'high' ? 'bg-orange-500 text-white' : ''}
                ${priority === 'medium' ? 'bg-yellow-500 text-white' : ''}
              `}>
                {priorityLabels[priority]}
              </span>
            )}
          </div>
        )}

        {/* Assignee */}
        {assignee && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <UserIcon className="w-3 h-3" />
            <span>{assignee.name}</span>
          </div>
        )}

        {/* Case ID Badge */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">
            Case #{step.caseId}
          </span>
        </div>
      </div>

      {/* Drag Handle Indicator */}
      {isSortableDragging && (
        <div className="absolute inset-0 bg-blue-200 opacity-20 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};