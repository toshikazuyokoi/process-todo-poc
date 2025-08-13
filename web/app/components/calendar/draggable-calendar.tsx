'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { MonthView } from './month-view';
import { WeekDayView } from './week-day-view';
import { Button } from '@/app/components/ui/button';
import { Calendar, List, Clock, Grip } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  color?: string;
  extendedProps?: {
    caseId?: number;
    stepId?: number;
    status?: string;
    assignee?: string;
    type: 'case' | 'step';
  };
}

interface DraggableCalendarProps {
  events: CalendarEvent[];
  viewMode?: 'month' | 'week' | 'day';
  onEventUpdate?: (event: CalendarEvent, newStart: Date) => Promise<void>;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  height?: string;
}

// ドラッグ可能なイベントカード
function DraggableEventCard({
  event,
  isDragging,
}: {
  event: CalendarEvent;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const getEventColor = (status?: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-amber-500';
      case 'blocked':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative p-2 rounded text-xs text-white cursor-move
        ${getEventColor(event.extendedProps?.status)}
        hover:opacity-80 transition-opacity
      `}
      data-testid={`draggable-event-${event.id}`}
    >
      <div className="flex items-center gap-1">
        <Grip
          className="h-3 w-3 opacity-50"
          {...attributes}
          {...listeners}
        />
        <span className="truncate">
          {event.extendedProps?.type === 'case' ? '📋' : '✓'} {event.title}
        </span>
      </div>
      {event.extendedProps?.assignee && (
        <div className="text-xs opacity-80 ml-4">{event.extendedProps.assignee}</div>
      )}
    </div>
  );
}

export function DraggableCalendar({
  events,
  viewMode = 'month',
  onEventUpdate,
  onEventClick,
  onDateClick,
  height = '600px',
}: DraggableCalendarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState(viewMode);
  const [isDragEnabled, setIsDragEnabled] = useState(true);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !active || active.id === over.id) {
      return;
    }

    // ドロップ先の日付を取得
    const targetDateStr = over.id as string;
    if (!targetDateStr.startsWith('day-')) {
      return;
    }

    const targetDate = parseISO(targetDateStr.replace('day-', ''));
    const activeEvent = events.find(e => e.id === active.id);

    if (!activeEvent || !onEventUpdate) {
      return;
    }

    // イベントの開始日を更新
    const currentStart = typeof activeEvent.start === 'string'
      ? parseISO(activeEvent.start)
      : activeEvent.start;

    const daysDiff = differenceInDays(targetDate, currentStart);
    
    if (daysDiff === 0) {
      return; // 同じ日にドロップされた場合は何もしない
    }

    const newStart = addDays(currentStart, daysDiff);

    try {
      await onEventUpdate(activeEvent, newStart);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const activeEvent = activeId ? events.find(e => e.id === activeId) : null;

  const renderView = () => {
    if (!isDragEnabled) {
      // ドラッグ無効時は通常のビューを表示
      switch (selectedView) {
        case 'week':
        case 'day':
          return (
            <WeekDayView
              events={events}
              viewMode={selectedView}
              onEventClick={onEventClick}
              onTimeSlotClick={onDateClick}
              height={height}
            />
          );
        default:
          return (
            <MonthView
              events={events}
              onEventClick={onEventClick}
              onDateClick={onDateClick}
              height={height}
            />
          );
      }
    }

    // ドラッグ有効時はDnDコンテキストでラップ
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={events.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {selectedView === 'month' ? (
            <MonthView
              events={events}
              onEventClick={onEventClick}
              onDateClick={onDateClick}
              height={height}
            />
          ) : (
            <WeekDayView
              events={events}
              viewMode={selectedView as 'week' | 'day'}
              onEventClick={onEventClick}
              onTimeSlotClick={onDateClick}
              height={height}
            />
          )}
        </SortableContext>

        <DragOverlay>
          {activeEvent ? (
            <DraggableEventCard event={activeEvent} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  return (
    <div className="space-y-4">
      {/* ビュー切り替えとドラッグ設定 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('month')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            月表示
          </Button>
          <Button
            variant={selectedView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('week')}
          >
            <List className="h-4 w-4 mr-1" />
            週表示
          </Button>
          <Button
            variant={selectedView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('day')}
          >
            <Clock className="h-4 w-4 mr-1" />
            日表示
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDragEnabled}
              onChange={(e) => setIsDragEnabled(e.target.checked)}
              className="rounded"
            />
            ドラッグ&ドロップを有効にする
          </label>
        </div>
      </div>

      {/* ドラッグ有効時の説明 */}
      {isDragEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-blue-900">
            <Grip className="h-4 w-4" />
            <span>イベントをドラッグして日付を変更できます</span>
          </div>
        </div>
      )}

      {/* カレンダービュー */}
      {renderView()}
    </div>
  );
}