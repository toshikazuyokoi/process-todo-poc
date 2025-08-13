'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface SortableStepItemProps {
  id: string;
  step: {
    id: number;
    name: string;
    description?: string;
    requiredDays: number;
    bufferDays: number;
    order: number;
  };
  onEdit: (step: any) => void;
  onDelete: (id: number) => void;
  isDragging?: boolean;
}

export function SortableStepItem({ 
  id, 
  step, 
  onEdit, 
  onDelete,
  isDragging 
}: SortableStepItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border rounded-lg p-4 mb-2
        ${isSortableDragging ? 'shadow-2xl' : 'shadow-sm'}
        ${isDragging ? 'ring-2 ring-blue-500' : ''}
        transition-all duration-200
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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-500">
              ステップ {step.order}
            </span>
            <h3 className="font-semibold text-gray-900">{step.name}</h3>
          </div>
          
          {step.description && (
            <p className="text-sm text-gray-600 mb-2">{step.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              必要日数: <span className="font-medium text-gray-700">{step.requiredDays}日</span>
            </span>
            <span className="text-gray-500">
              バッファ: <span className="font-medium text-gray-700">{step.bufferDays}日</span>
            </span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(step)}
            className="hover:bg-gray-100"
            aria-label="編集"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(step.id)}
            className="hover:bg-red-50 hover:text-red-600"
            aria-label="削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}