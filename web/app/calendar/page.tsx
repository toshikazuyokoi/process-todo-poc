'use client';

import { useState, useEffect } from 'react';
import { DraggableCalendar } from '@/app/components/calendar/draggable-calendar';
import { apiClient } from '@/app/lib/api-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { CalendarDays, RefreshCw } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  extendedProps?: {
    caseId?: number;
    stepId?: number;
    status?: string;
    assignee?: string;
    type: 'case' | 'step';
  };
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // ケースとステップのデータを取得
      const [casesResponse, stepsResponse] = await Promise.all([
        apiClient.get('/cases'),
        apiClient.get('/steps'),
      ]);

      const calendarEvents: CalendarEvent[] = [];

      // ケースをイベントに変換
      casesResponse.data.forEach((caseItem: any) => {
        if (caseItem.goalDateUtc) {
          calendarEvents.push({
            id: `case-${caseItem.id}`,
            title: caseItem.title,
            start: caseItem.goalDateUtc,
            extendedProps: {
              caseId: caseItem.id,
              status: caseItem.status,
              type: 'case',
            },
          });
        }
      });

      // ステップをイベントに変換
      stepsResponse.data.forEach((step: any) => {
        if (step.dueDateUtc) {
          calendarEvents.push({
            id: `step-${step.id}`,
            title: step.name,
            start: step.dueDateUtc,
            extendedProps: {
              stepId: step.id,
              caseId: step.caseId,
              status: step.status,
              assignee: step.assigneeId,
              type: 'step',
            },
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      // ダミーデータを設定（開発用）
      setEvents([
        {
          id: '1',
          title: 'プロジェクトA 期限',
          start: '2025-01-20',
          extendedProps: {
            caseId: 1,
            status: 'in_progress',
            type: 'case',
          },
        },
        {
          id: '2',
          title: '設計レビュー',
          start: '2025-01-15T14:00:00',
          end: '2025-01-15T16:00:00',
          extendedProps: {
            stepId: 1,
            status: 'pending',
            type: 'step',
            assignee: '田中',
          },
        },
        {
          id: '3',
          title: '実装完了',
          start: '2025-01-25',
          extendedProps: {
            stepId: 2,
            status: 'pending',
            type: 'step',
            assignee: '佐藤',
          },
        },
        {
          id: '4',
          title: 'テスト実施',
          start: '2025-01-28',
          extendedProps: {
            stepId: 3,
            status: 'pending',
            type: 'step',
            assignee: '鈴木',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.extendedProps?.caseId && event.extendedProps.type === 'case') {
      router.push(`/cases/${event.extendedProps.caseId}`);
    } else if (event.extendedProps?.stepId) {
      // ステップの詳細モーダルを開く（後で実装）
      console.log('Step clicked:', event);
    }
  };

  const handleEventUpdate = async (event: CalendarEvent, newStart: Date) => {
    console.log('Event updated:', { event, newStart });
    
    try {
      if (event.extendedProps?.type === 'case' && event.extendedProps.caseId) {
        // ケースの期限を更新
        await apiClient.put(`/cases/${event.extendedProps.caseId}`, {
          goalDateUtc: newStart.toISOString(),
        });
      } else if (event.extendedProps?.type === 'step' && event.extendedProps.stepId) {
        // ステップの期限を更新
        await apiClient.put(`/steps/${event.extendedProps.stepId}`, {
          dueDateUtc: newStart.toISOString(),
        });
      }
      
      // イベントを再読み込み
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      // エラー時は元に戻す
      await loadEvents();
    }
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // 新規ケース作成モーダルを開く（後で実装）
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>カレンダーを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">カレンダービュー</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadEvents()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-blue-900 mb-2">使い方</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• イベントをドラッグ&ドロップで日付を変更できます</li>
            <li>• イベントをクリックして詳細を表示</li>
            <li>• 右上のボタンで月/週/日表示を切り替え</li>
            <li>• 日付をクリックして新規イベントを作成（開発中）</li>
          </ul>
        </div>
      </div>

      <DraggableCalendar
        events={events}
        viewMode="month"
        onEventUpdate={handleEventUpdate}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        height="calc(100vh - 250px)"
      />
    </div>
  );
}