'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

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

interface MonthViewProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
  height?: string;
}

export function MonthView({
  events = [],
  onEventClick,
  onDateClick,
  selectedDate = new Date(),
  height = '600px',
}: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // 月の日付リストを生成
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 曜日のヘッダー
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 月の最初の日の曜日を取得（パディング用）
  const firstDayOfWeek = monthDays[0].getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  // イベントを日付でグループ化
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.start);
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [events]);

  // イベントの色を取得
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

  // 前月へ
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 次月へ
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 今日へ
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // イベントの表示数制限と「もっと見る」の処理
  const getVisibleEvents = (dayEvents: CalendarEvent[], limit: number = 3) => {
    if (dayEvents.length <= limit) {
      return { visible: dayEvents, hasMore: false, moreCount: 0 };
    }
    return {
      visible: dayEvents.slice(0, limit - 1),
      hasMore: true,
      moreCount: dayEvents.length - (limit - 1),
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4" style={{ height }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            aria-label="前月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            aria-label="次月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            今日
          </Button>
        </div>
        
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h2>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden" 
           style={{ height: 'calc(100% - 60px)' }}>
        {/* 曜日ヘッダー */}
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`
              bg-gray-50 p-2 text-center text-sm font-semibold
              ${index === 0 ? 'text-red-500' : ''}
              ${index === 6 ? 'text-blue-500' : ''}
            `}
          >
            {day}
          </div>
        ))}

        {/* 空白のパディング */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="bg-gray-50" />
        ))}

        {/* 日付セル */}
        {monthDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const { visible, hasMore, moreCount } = getVisibleEvents(dayEvents);
          const isCurrentDay = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={dateKey}
              className={`
                bg-white p-2 min-h-[100px] cursor-pointer
                hover:bg-gray-50 transition-colors
                ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-400' : ''}
                ${isSelected ? 'bg-blue-100' : ''}
                relative overflow-hidden
              `}
              onClick={() => onDateClick?.(day)}
              data-testid={`day-${dateKey}`}
            >
              <div className={`
                text-sm font-medium mb-1
                ${dayOfWeek === 0 ? 'text-red-500' : ''}
                ${dayOfWeek === 6 ? 'text-blue-500' : ''}
                ${isCurrentDay ? 'font-bold' : ''}
              `}>
                {format(day, 'd')}
              </div>

              {/* イベント表示 */}
              <div className="space-y-1">
                {visible.map((event) => (
                  <div
                    key={event.id}
                    className={`
                      text-xs p-1 rounded truncate cursor-pointer
                      ${getEventColor(event.extendedProps?.status)}
                      text-white hover:opacity-80 transition-opacity
                      ${hoveredEvent === event.id ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    onMouseEnter={() => setHoveredEvent(event.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    title={`${event.title}${event.extendedProps?.assignee ? ` - ${event.extendedProps.assignee}` : ''}`}
                    data-testid={`event-${event.id}`}
                  >
                    {event.extendedProps?.type === 'case' ? '📋' : '✓'} {event.title}
                  </div>
                ))}

                {/* もっと見るリンク */}
                {hasMore && (
                  <div
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: ポップアップで全イベントを表示
                      console.log(`Show all ${dayEvents.length} events for ${dateKey}`);
                    }}
                    data-testid={`more-${dateKey}`}
                  >
                    他{moreCount}件
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ツールチップ（ホバー時の詳細表示） */}
      {hoveredEvent && (
        <div className="absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
             style={{ 
               position: 'fixed',
               bottom: '20px',
               left: '50%',
               transform: 'translateX(-50%)'
             }}>
          {events.find(e => e.id === hoveredEvent)?.title}
        </div>
      )}
    </div>
  );
}