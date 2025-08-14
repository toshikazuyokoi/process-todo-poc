'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  isToday,
  isSameDay,
  isSameHour,
  addDays,
  subDays,
  parseISO,
  getHours,
  getMinutes
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
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

interface WeekDayViewProps {
  events?: CalendarEvent[];
  viewMode: 'week' | 'day';
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date) => void;
  selectedDate?: Date;
  businessHours?: {
    start: number;
    end: number;
  };
  height?: string;
}

export function WeekDayView({
  events = [],
  viewMode = 'week',
  onEventClick,
  onTimeSlotClick,
  selectedDate = new Date(),
  businessHours = { start: 9, end: 18 },
  height = '600px',
}: WeekDayViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // 表示する時間帯（7:00-21:00）
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(hour);
    }
    return slots;
  }, []);

  // 週表示の場合の日付リスト
  const weekDays = useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate];
    }
    const start = startOfWeek(currentDate, { locale: ja });
    const end = endOfWeek(currentDate, { locale: ja });
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  // イベントを時間帯別にグループ化
  const eventsByTimeSlot = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    events.forEach(event => {
      const eventDate = typeof event.start === 'string' ? parseISO(event.start) : event.start;
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      const hour = getHours(eventDate);
      const timeKey = `${dateKey}-${hour}`;
      
      if (!grouped[timeKey]) {
        grouped[timeKey] = [];
      }
      grouped[timeKey].push(event);
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

  // ナビゲーション
  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // イベントの位置とサイズを計算
  const getEventStyle = (event: CalendarEvent) => {
    const eventDate = typeof event.start === 'string' ? parseISO(event.start) : event.start;
    const minutes = getMinutes(eventDate);
    const top = `${(minutes / 60) * 100}%`;
    
    // イベントの長さ（デフォルト1時間）
    let duration = 60; // minutes
    if (event.end) {
      const endDate = typeof event.end === 'string' ? parseISO(event.end) : event.end;
      duration = (endDate.getTime() - eventDate.getTime()) / (1000 * 60);
    }
    const height = `${(duration / 60) * 100}%`;
    
    return { top, height: height || '100%' };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4" style={{ height }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            aria-label={viewMode === 'week' ? '前週' : '前日'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            aria-label={viewMode === 'week' ? '次週' : '次日'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToday}
          >
            今日
          </Button>
        </div>
        
        <h2 className="text-xl font-bold flex items-center gap-2">
          {viewMode === 'week' ? (
            <>
              <Calendar className="h-5 w-5" />
              {format(weekDays[0], 'yyyy年 M月 d日', { locale: ja })} - {format(weekDays[6], 'd日', { locale: ja })}
            </>
          ) : (
            <>
              <Clock className="h-5 w-5" />
              {format(currentDate, 'yyyy年 M月 d日 (E)', { locale: ja })}
            </>
          )}
        </h2>
      </div>

      {/* タイムグリッド */}
      <div className="relative overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
        <div className="grid" style={{ 
          gridTemplateColumns: viewMode === 'week' 
            ? 'auto repeat(7, 1fr)' 
            : 'auto 1fr'
        }}>
          {/* 時間軸ヘッダー */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-r"></div>
          {weekDays.map((day) => (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={`
                sticky top-0 z-10 bg-gray-50 border-b px-2 py-1 text-center
                ${isToday(day) ? 'bg-blue-50 font-bold' : ''}
              `}
            >
              <div className="text-sm font-medium">
                {format(day, viewMode === 'week' ? 'E' : 'EEEE', { locale: ja })}
              </div>
              <div className={`text-lg ${day.getDay() === 0 ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}

          {/* 時間スロット */}
          {timeSlots.map((hour) => (
            <React.Fragment key={`hour-${hour}`}>
              {/* 時間ラベル */}
              <div
                className="border-r border-b p-2 text-right text-sm text-gray-500"
                style={{ height: '60px' }}
              >
                {hour}:00
              </div>
              
              {/* 各日の時間スロット */}
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const timeKey = `${dateKey}-${hour}`;
                const slotEvents = eventsByTimeSlot[timeKey] || [];
                const isBusinessHour = hour >= businessHours.start && hour < businessHours.end;
                const isCurrentHour = isToday(day) && new Date().getHours() === hour;
                
                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    className={`
                      relative border-b border-r cursor-pointer
                      ${isBusinessHour ? 'bg-white' : 'bg-gray-50'}
                      ${isCurrentHour ? 'bg-yellow-50' : ''}
                      hover:bg-gray-100 transition-colors
                    `}
                    style={{ height: '60px' }}
                    onClick={() => {
                      const clickedDate = new Date(day);
                      clickedDate.setHours(hour, 0, 0, 0);
                      onTimeSlotClick?.(clickedDate);
                    }}
                    data-testid={`slot-${dateKey}-${hour}`}
                  >
                    {/* イベント表示 */}
                    {slotEvents.map((event, index) => {
                      const style = getEventStyle(event);
                      return (
                        <div
                          key={event.id}
                          className={`
                            absolute left-0 right-0 mx-1 p-1 rounded text-xs text-white
                            ${getEventColor(event.extendedProps?.status)}
                            ${hoveredEvent === event.id ? 'ring-2 ring-offset-1 ring-gray-400 z-20' : ''}
                            hover:opacity-80 transition-opacity cursor-pointer
                          `}
                          style={{
                            top: style.top,
                            minHeight: '20px',
                            height: style.height,
                            zIndex: hoveredEvent === event.id ? 20 : 10 + index,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          onMouseEnter={() => setHoveredEvent(event.id)}
                          onMouseLeave={() => setHoveredEvent(null)}
                          title={`${event.title}${event.extendedProps?.assignee ? ` - ${event.extendedProps.assignee}` : ''}`}
                          data-testid={`event-${event.id}`}
                        >
                          <div className="truncate font-medium">
                            {format(typeof event.start === 'string' ? parseISO(event.start) : event.start, 'HH:mm')} {event.title}
                          </div>
                          {event.extendedProps?.assignee && (
                            <div className="truncate opacity-80 text-xs">
                              {event.extendedProps.assignee}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* 現在時刻のライン */}
        {weekDays.some(day => isToday(day)) && (
          <div
            className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-30"
            style={{
              top: `${((new Date().getHours() - 7 + new Date().getMinutes() / 60) / (21 - 7 + 1)) * 100}%`,
            }}
          >
            <div className="absolute -top-2 left-0 bg-red-500 text-white text-xs px-1 rounded">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
        )}
      </div>

      {/* ツールチップ */}
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