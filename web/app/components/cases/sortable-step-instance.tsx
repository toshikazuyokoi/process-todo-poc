'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface StepInstance {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate?: string;
  assignee?: {
    id: number;
    name: string;
  };
  order: number;
  completedAt?: string;
}

interface SortableStepInstanceProps {
  id: string;
  step: StepInstance;
  onStatusChange: (stepId: number, status: string) => void;
  onAssign: (stepId: number) => void;
  isDragging?: boolean;
}

const statusConfig = {
  pending: {
    label: '未着手',
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: '進行中',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  completed: {
    label: '完了',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  blocked: {
    label: 'ブロック',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

export function SortableStepInstance({
  id,
  step,
  onStatusChange,
  onAssign,
  isDragging,
}: SortableStepInstanceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const status = statusConfig[step.status];
  const StatusIcon = status.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border rounded-lg p-4 mb-2
        ${isSortableDragging ? 'shadow-2xl' : 'shadow-sm'}
        ${isDragging ? 'ring-2 ring-blue-500' : ''}
        transition-all duration-200 hover:shadow-md
      `}
    >
      <div className="flex items-start gap-3">
        {/* ドラッグハンドル */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab hover:bg-gray-100 rounded p-1 transition-colors"
          aria-label="ドラッグして順序を変更"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>

        {/* ステップ情報 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                ステップ {step.order}
              </span>
              <h3 className="font-semibold text-gray-900">{step.name}</h3>
            </div>
            
            {/* ステータスバッジ */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${status.bgColor}`}>
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
              <span className={`text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {/* 期限 */}
            {step.dueDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  期限: {format(new Date(step.dueDate), 'M月d日', { locale: ja })}
                </span>
              </div>
            )}

            {/* 担当者 */}
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-gray-400" />
              {step.assignee ? (
                <span className="text-gray-600">{step.assignee.name}</span>
              ) : (
                <button
                  onClick={() => onAssign(step.id)}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  担当者を割り当て
                </button>
              )}
            </div>

            {/* 完了日 */}
            {step.completedAt && (
              <span className="text-gray-500">
                完了: {format(new Date(step.completedAt), 'M月d日', { locale: ja })}
              </span>
            )}
          </div>
        </div>

        {/* ステータス変更ボタン */}
        <div className="flex items-center gap-1">
          {step.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextStatus = step.status === 'pending' ? 'in_progress' : 'completed';
                onStatusChange(step.id, nextStatus);
              }}
              className="text-xs"
            >
              {step.status === 'pending' ? '開始' : '完了'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}