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
import { SortableStepItem } from './sortable-step-item';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Step {
  id: number;
  name: string;
  description?: string;
  requiredDays: number;
  bufferDays: number;
  order: number;
}

interface SortableStepsListProps {
  steps: Step[];
  onReorder: (steps: Step[]) => void;
  onAdd: () => void;
  onEdit: (step: Step) => void;
  onDelete: (id: number) => void;
}

export function SortableStepsList({
  steps: initialSteps,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
}: SortableStepsListProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 親コンポーネントからの更新を反映
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動してからドラッグ開始
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">ステップ一覧</h3>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          ステップを追加
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">ステップがまだありません</p>
          <Button onClick={onAdd} variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            最初のステップを追加
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => `step-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {steps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  id={`step-${step.id}`}
                  step={step}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isDragging={`step-${step.id}` === activeId}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeStep ? (
              <div className="shadow-2xl opacity-90">
                <SortableStepItem
                  id={`step-${activeStep.id}`}
                  step={activeStep}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {steps.length > 0 && (
        <div className="text-sm text-gray-500 text-center mt-4">
          ドラッグ&ドロップでステップの順序を変更できます
        </div>
      )}
    </div>
  );
}