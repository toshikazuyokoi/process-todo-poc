'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStepInstance } from './sortable-step-instance';
import { Filter } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Select } from '@/app/components/ui/select';

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

interface SortableStepInstancesListProps {
  steps: StepInstance[];
  onReorder: (steps: StepInstance[]) => void;
  onStatusChange: (stepId: number, status: string) => void;
  onAssign: (stepId: number) => void;
}

export function SortableStepInstancesList({
  steps: initialSteps,
  onReorder,
  onStatusChange,
  onAssign,
}: SortableStepInstancesListProps) {
  const [steps, setSteps] = useState<StepInstance[]>(initialSteps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // 親コンポーネントからの更新を反映
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => `step-${s.id}` === active.id);
      const newIndex = steps.findIndex((s) => `step-${s.id}` === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      
      // 順序番号を更新
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      }));

      setSteps(reorderedSteps);
      onReorder(reorderedSteps);
    }

    setActiveId(null);
  };

  const activeStep = activeId 
    ? steps.find((s) => `step-${s.id}` === activeId)
    : null;

  // フィルタリング
  const filteredSteps = steps.filter((step) => {
    if (filter === 'all') return true;
    return step.status === filter;
  });

  // 統計情報
  const stats = {
    total: steps.length,
    completed: steps.filter((s) => s.status === 'completed').length,
    inProgress: steps.filter((s) => s.status === 'in_progress').length,
    pending: steps.filter((s) => s.status === 'pending').length,
    blocked: steps.filter((s) => s.status === 'blocked').length,
  };

  const progress = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">ステップ一覧</h3>
            <p className="text-sm text-gray-500 mt-1">
              進捗: {stats.completed}/{stats.total} 完了 ({progress}%)
            </p>
          </div>
          
          {/* フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              name="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'all', label: 'すべて' },
                { value: 'pending', label: '未着手' },
                { value: 'in_progress', label: '進行中' },
                { value: 'completed', label: '完了' },
                { value: 'blocked', label: 'ブロック' },
              ]}
              className="w-32"
            />
          </div>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
            <div className="text-xs text-gray-500">未着手</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-gray-500">進行中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-500">完了</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <div className="text-xs text-gray-500">ブロック</div>
          </div>
        </div>
      </div>

      {/* ステップリスト */}
      {filteredSteps.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'ステップがありません' 
              : `${filter}のステップがありません`}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredSteps.map((s) => `step-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredSteps.map((step) => (
                <SortableStepInstance
                  key={step.id}
                  id={`step-${step.id}`}
                  step={step}
                  onStatusChange={onStatusChange}
                  onAssign={onAssign}
                  isDragging={`step-${step.id}` === activeId}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeStep ? (
              <div className="shadow-2xl opacity-90">
                <SortableStepInstance
                  id={`step-${activeStep.id}`}
                  step={activeStep}
                  onStatusChange={() => {}}
                  onAssign={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {filteredSteps.length > 0 && filter === 'all' && (
        <div className="text-sm text-gray-500 text-center mt-4">
          ドラッグ&ドロップでステップの優先順位を変更できます
        </div>
      )}
    </div>
  );
}