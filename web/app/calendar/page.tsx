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
      // ケースデータを取得（ステップは各ケースに含まれる）
      const casesResponse = await apiClient.get('/cases');

      const calendarEvents: CalendarEvent[] = [];

      // ケースとそのステップをイベントに変換
      for (const caseItem of casesResponse.data) {
        // ケースをイベントに追加
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

        // ステップインスタンスをイベントに変換
        if (caseItem.stepInstances && Array.isArray(caseItem.stepInstances)) {
          caseItem.stepInstances.forEach((step: any) => {
            // 開始日と終了日を設定
            const startDate = step.startDateUtc || step.createdAt;
            const endDate = step.dueDateUtc;
            
            if (endDate) {
              calendarEvents.push({
                id: `step-${step.id}`,
                title: `${step.name} (${caseItem.title})`,
                start: startDate,
                end: endDate,
                extendedProps: {
                  stepId: step.id,
                  caseId: caseItem.id,
                  status: step.status,
                  assignee: step.assigneeId,
                  type: 'step',
                },
              });
            }
          });
        }
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      // エラー時は空のイベントを表示
      setEvents([]);
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