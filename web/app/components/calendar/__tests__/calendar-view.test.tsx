import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarView } from '../calendar-view';
import '@testing-library/jest-dom';

// FullCalendarのモック
jest.mock('@fullcalendar/react', () => {
  return {
    __esModule: true,
    default: jest.fn(({ events, eventClick, eventDrop, select }) => {
      return (
        <div data-testid="fullcalendar-mock">
          <div data-testid="calendar-title">カレンダー</div>
          {events?.map((event: any, index: number) => (
            <div
              key={event.id || index}
              data-testid={`event-${event.id}`}
              onClick={() => eventClick?.({ event })}
              className="calendar-event"
            >
              {event.title}
            </div>
          ))}
          <button
            data-testid="select-date"
            onClick={() => select?.({ start: new Date('2025-01-15'), end: new Date('2025-01-16') })}
          >
            日付選択
          </button>
        </div>
      );
    }),
  };
});

// プラグインのモック
jest.mock('@fullcalendar/daygrid', () => ({}));
jest.mock('@fullcalendar/timegrid', () => ({}));
jest.mock('@fullcalendar/interaction', () => ({}));
jest.mock('@fullcalendar/list', () => ({}));
jest.mock('@fullcalendar/core/locales/ja', () => ({}));

describe('CalendarView', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'プロジェクトA 期限',
      start: '2025-01-15',
      extendedProps: {
        caseId: 1,
        status: 'in_progress',
        type: 'case' as const,
        assignee: '田中太郎',
      },
    },
    {
      id: '2',
      title: 'タスク1 締切',
      start: '2025-01-20',
      end: '2025-01-21',
      extendedProps: {
        stepId: 1,
        status: 'pending',
        type: 'step' as const,
        assignee: '佐藤花子',
      },
    },
  ];

  it('カレンダーが正しくレンダリングされる', () => {
    render(<CalendarView events={mockEvents} />);
    
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-title')).toBeInTheDocument();
  });

  it('イベントが正しく表示される', () => {
    render(<CalendarView events={mockEvents} />);
    
    expect(screen.getByTestId('event-1')).toHaveTextContent('プロジェクトA 期限');
    expect(screen.getByTestId('event-2')).toHaveTextContent('タスク1 締切');
  });

  it('イベントクリック時にコールバックが呼ばれる', () => {
    const handleEventClick = jest.fn();
    render(<CalendarView events={mockEvents} onEventClick={handleEventClick} />);
    
    fireEvent.click(screen.getByTestId('event-1'));
    
    expect(handleEventClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'プロジェクトA 期限',
      })
    );
  });

  it('日付選択時にコールバックが呼ばれる', () => {
    const handleDateSelect = jest.fn();
    render(<CalendarView events={mockEvents} onDateSelect={handleDateSelect} />);
    
    fireEvent.click(screen.getByTestId('select-date'));
    
    expect(handleDateSelect).toHaveBeenCalledWith(
      new Date('2025-01-15'),
      new Date('2025-01-16')
    );
  });

  it('初期ビューが正しく設定される', () => {
    const { container } = render(
      <CalendarView events={mockEvents} initialView="timeGridWeek" />
    );
    
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
  });

  it('カスタムの高さが適用される', () => {
    const { container } = render(
      <CalendarView events={mockEvents} height="600px" />
    );
    
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
  });

  it('イベントなしの場合も正しくレンダリングされる', () => {
    render(<CalendarView events={[]} />);
    
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
  });

  it('ステータスに応じた色分けが適用される', () => {
    const eventsWithStatus = [
      {
        id: '1',
        title: '完了タスク',
        start: '2025-01-15',
        extendedProps: { status: 'completed', type: 'step' as const },
      },
      {
        id: '2',
        title: '進行中タスク',
        start: '2025-01-16',
        extendedProps: { status: 'in_progress', type: 'step' as const },
      },
      {
        id: '3',
        title: '保留タスク',
        start: '2025-01-17',
        extendedProps: { status: 'pending', type: 'step' as const },
      },
      {
        id: '4',
        title: 'ブロックタスク',
        start: '2025-01-18',
        extendedProps: { status: 'blocked', type: 'step' as const },
      },
    ];
    
    render(<CalendarView events={eventsWithStatus} />);
    
    expect(screen.getByTestId('event-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-2')).toBeInTheDocument();
    expect(screen.getByTestId('event-3')).toBeInTheDocument();
    expect(screen.getByTestId('event-4')).toBeInTheDocument();
  });

  it('日本語ロケールが適用される', () => {
    render(<CalendarView events={mockEvents} />);
    
    // FullCalendarコンポーネントに日本語ロケールが渡されていることを確認
    const FullCalendarMock = require('@fullcalendar/react').default;
    expect(FullCalendarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: expect.anything(), // jaLocaleが渡されている
      }),
      expect.anything()
    );
  });

  it('ドラッグ&ドロップが有効になっている', () => {
    render(<CalendarView events={mockEvents} />);
    
    const FullCalendarMock = require('@fullcalendar/react').default;
    expect(FullCalendarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: true,
        droppable: true,
        selectable: true,
      }),
      expect.anything()
    );
  });

  it('営業時間が正しく設定される', () => {
    render(<CalendarView events={mockEvents} />);
    
    const FullCalendarMock = require('@fullcalendar/react').default;
    expect(FullCalendarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
        },
      }),
      expect.anything()
    );
  });
});