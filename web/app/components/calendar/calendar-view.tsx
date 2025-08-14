'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import jaLocale from '@fullcalendar/core/locales/ja';
import { EventInput, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CalendarEvent extends EventInput {
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

interface CalendarViewProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, oldDate: Date, newDate: Date) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  height?: string;
}

export function CalendarView({
  events = [],
  onEventClick,
  onEventDrop,
  onDateSelect,
  initialView = 'dayGridMonth',
  height = '800px',
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState(initialView);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // イベントの色分け処理
    const processedEvents = events.map((event) => {
      const color = getEventColor(event.extendedProps?.status);
      return {
        ...event,
        color,
        className: `calendar-event-${event.extendedProps?.type || 'default'}`,
      };
    });
    setCalendarEvents(processedEvents);
  }, [events]);

  const getEventColor = (status?: string): string => {
    switch (status) {
      case 'completed':
        return '#10b981'; // green-500
      case 'in_progress':
        return '#3b82f6'; // blue-500
      case 'pending':
        return '#f59e0b'; // amber-500
      case 'blocked':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event: CalendarEvent = {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start || new Date(),
      end: clickInfo.event.end || undefined,
      extendedProps: clickInfo.event.extendedProps,
    };
    onEventClick?.(event);
  };

  const handleEventDrop = (dropInfo: EventDropArg) => {
    const event: CalendarEvent = {
      id: dropInfo.event.id,
      title: dropInfo.event.title,
      start: dropInfo.event.start || new Date(),
      end: dropInfo.event.end || undefined,
      extendedProps: dropInfo.event.extendedProps,
    };
    const oldDate = dropInfo.oldEvent.start || new Date();
    const newDate = dropInfo.event.start || new Date();
    onEventDrop?.(event, oldDate, newDate);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    onDateSelect?.(selectInfo.start, selectInfo.end);
  };

  const customButtons = {
    todayButton: {
      text: '今日',
      click: function() {
        // カレンダーを今日の日付に移動
      }
    }
  };

  return (
    <div className="calendar-container bg-white rounded-lg shadow-lg p-4">
      <style jsx global>{`
        .fc {
          font-family: 'Noto Sans JP', sans-serif;
        }
        
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #e5e7eb;
        }
        
        .fc-button-primary {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        
        .fc-button-primary:hover {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }
        
        .fc-button-primary:disabled {
          background-color: #9ca3af !important;
          border-color: #9ca3af !important;
        }
        
        .fc-today-button {
          background-color: #10b981 !important;
          border-color: #10b981 !important;
        }
        
        .fc-col-header-cell {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        
        .fc-day-sun .fc-col-header-cell-cushion {
          color: #ef4444;
        }
        
        .fc-day-sat .fc-col-header-cell-cushion {
          color: #3b82f6;
        }
        
        .fc-daygrid-day-number {
          font-size: 0.875rem;
          padding: 0.25rem;
        }
        
        .fc-day-sun .fc-daygrid-day-number {
          color: #ef4444;
        }
        
        .fc-day-sat .fc-daygrid-day-number {
          color: #3b82f6;
        }
        
        .fc-event {
          border: none;
          padding: 2px 4px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .fc-event:hover {
          opacity: 0.8;
        }
        
        .calendar-event-case {
          font-weight: 600;
        }
        
        .calendar-event-step {
          font-style: italic;
        }
        
        .fc-popover {
          z-index: 1000;
        }
        
        .fc-more-link {
          color: #3b82f6;
          font-weight: 500;
        }
        
        @media (max-width: 640px) {
          .fc-toolbar {
            flex-direction: column;
          }
          
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            margin: 0.25rem 0;
          }
        }
      `}</style>
      
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        locale={jaLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        events={calendarEvents}
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        weekends={true}
        height={height}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        select={handleDateSelect}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5], // 月曜日から金曜日
          startTime: '09:00',
          endTime: '18:00',
        }}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:30:00"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
        }}
        views={{
          dayGridMonth: {
            titleFormat: { year: 'numeric', month: 'long' },
            dayHeaderFormat: { weekday: 'short' },
          },
          timeGridWeek: {
            titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
            dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' },
          },
          timeGridDay: {
            titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
          },
          listWeek: {
            titleFormat: { year: 'numeric', month: 'long' },
            listDayFormat: { month: 'long', day: 'numeric', weekday: 'long' },
            listDaySideFormat: false,
          },
        }}
        eventContent={(eventInfo) => {
          const { event } = eventInfo;
          return (
            <div className="p-1 overflow-hidden">
              <div className="text-xs font-medium truncate">{event.title}</div>
              {event.extendedProps.assignee && (
                <div className="text-xs opacity-75 truncate">
                  {event.extendedProps.assignee}
                </div>
              )}
            </div>
          );
        }}
        moreLinkContent={(args) => {
          return `他${args.num}件`;
        }}
        noEventsContent="予定はありません"
        allDayText="終日"
      />
    </div>
  );
}