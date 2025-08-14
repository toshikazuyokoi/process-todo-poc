import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonthView } from '../month-view';
import { format } from 'date-fns';
import '@testing-library/jest-dom';

describe('MonthView', () => {
  // 現在の月のイベントを作成
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  
  const mockEvents = [
    {
      id: '1',
      title: 'プロジェクトA',
      start: `${year}-${month}-15`,
      extendedProps: {
        caseId: 1,
        status: 'in_progress',
        type: 'case' as const,
      },
    },
    {
      id: '2',
      title: 'タスク1',
      start: `${year}-${month}-15`,
      extendedProps: {
        stepId: 1,
        status: 'pending',
        type: 'step' as const,
        assignee: '田中',
      },
    },
    {
      id: '3',
      title: 'タスク2',
      start: `${year}-${month}-20`,
      extendedProps: {
        stepId: 2,
        status: 'completed',
        type: 'step' as const,
      },
    },
  ];

  it('月表示カレンダーが正しくレンダリングされる', () => {
    render(<MonthView events={mockEvents} />);
    
    // 曜日ヘッダーの確認
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('月')).toBeInTheDocument();
    expect(screen.getByText('火')).toBeInTheDocument();
    expect(screen.getByText('水')).toBeInTheDocument();
    expect(screen.getByText('木')).toBeInTheDocument();
    expect(screen.getByText('金')).toBeInTheDocument();
    expect(screen.getByText('土')).toBeInTheDocument();
  });

  it('現在の月が表示される', () => {
    const currentDate = new Date();
    render(<MonthView events={mockEvents} />);
    
    const monthYear = format(currentDate, 'yyyy年 M月');
    expect(screen.getByText(monthYear)).toBeInTheDocument();
  });

  it('イベントが正しい日付に表示される', () => {
    render(<MonthView events={mockEvents} />);
    
    // 現在月の15日のイベントが表示される
    expect(screen.getByTestId('event-1')).toHaveTextContent('プロジェクトA');
    expect(screen.getByTestId('event-2')).toHaveTextContent('タスク1');
    
    // 現在月の20日のイベントが表示される
    expect(screen.getByTestId('event-3')).toHaveTextContent('タスク2');
  });

  it('イベントクリック時にコールバックが呼ばれる', () => {
    const handleEventClick = jest.fn();
    render(<MonthView events={mockEvents} onEventClick={handleEventClick} />);
    
    fireEvent.click(screen.getByTestId('event-1'));
    
    expect(handleEventClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'プロジェクトA',
      })
    );
  });

  it('日付クリック時にコールバックが呼ばれる', () => {
    const handleDateClick = jest.fn();
    render(<MonthView events={mockEvents} onDateClick={handleDateClick} />);
    
    const dateCell = screen.getByTestId(`day-${year}-${month}-15`);
    fireEvent.click(dateCell);
    
    expect(handleDateClick).toHaveBeenCalledWith(
      expect.any(Date)
    );
  });

  it('前月・次月ボタンが機能する', () => {
    render(<MonthView events={mockEvents} />);
    
    const prevButton = screen.getByLabelText('前月');
    const nextButton = screen.getByLabelText('次月');
    
    // 次月へ移動
    fireEvent.click(nextButton);
    const nextMonth = currentDate.getMonth() === 11 ? 1 : currentDate.getMonth() + 2;
    const nextYear = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    expect(screen.getByText(new RegExp(`${nextYear}年 ${nextMonth}月`))).toBeInTheDocument();
    
    // 前月へ移動（2回クリック）
    fireEvent.click(prevButton);
    fireEvent.click(prevButton);
    const prevMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    expect(screen.getByText(new RegExp(`${prevYear}年 ${prevMonth}月`))).toBeInTheDocument();
  });

  it('今日ボタンで現在の月に戻る', () => {
    render(<MonthView events={mockEvents} />);
    
    // 次月へ移動
    const nextButton = screen.getByLabelText('次月');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    // 今日ボタンで戻る
    const todayButton = screen.getByText('今日');
    fireEvent.click(todayButton);
    
    const currentDate = new Date();
    const monthYear = format(currentDate, 'yyyy年 M月');
    expect(screen.getByText(monthYear)).toBeInTheDocument();
  });

  it('ステータスに応じた色分けが適用される', () => {
    render(<MonthView events={mockEvents} />);
    
    const event1 = screen.getByTestId('event-1');
    const event2 = screen.getByTestId('event-2');
    const event3 = screen.getByTestId('event-3');
    
    // ステータスごとのクラスが適用されている
    expect(event1).toHaveClass('bg-blue-500'); // in_progress
    expect(event2).toHaveClass('bg-amber-500'); // pending
    expect(event3).toHaveClass('bg-green-500'); // completed
  });

  it('多数のイベントがある場合「もっと見る」が表示される', () => {
    const manyEvents = [
      ...mockEvents,
      {
        id: '4',
        title: 'タスク3',
        start: `${year}-${month}-15`,
        extendedProps: { type: 'step' as const },
      },
      {
        id: '5',
        title: 'タスク4',
        start: `${year}-${month}-15`,
        extendedProps: { type: 'step' as const },
      },
    ];
    
    render(<MonthView events={manyEvents} />);
    
    // 現在月の15日に「もっと見る」リンクが表示される
    expect(screen.getByTestId(`more-${year}-${month}-15`)).toHaveTextContent('他2件');
  });

  it('イベントタイプ（case/step）によってアイコンが異なる', () => {
    render(<MonthView events={mockEvents} />);
    
    const caseEvent = screen.getByTestId('event-1');
    const stepEvent = screen.getByTestId('event-2');
    
    expect(caseEvent).toHaveTextContent('📋');
    expect(stepEvent).toHaveTextContent('✓');
  });

  it('週末の日付が異なる色で表示される', () => {
    render(<MonthView events={mockEvents} />);
    
    // 日曜日と土曜日のスタイルを確認
    const sundayHeader = screen.getByText('日');
    const saturdayHeader = screen.getByText('土');
    
    // 曜日ヘッダー自体がtext-red-500/text-blue-500のクラスを持つ
    expect(sundayHeader.closest('div')).toHaveClass('text-red-500');
    expect(saturdayHeader.closest('div')).toHaveClass('text-blue-500');
  });

  it('選択された日付がハイライトされる', () => {
    const selectedDate = new Date(`${year}-${month}-15`);
    render(<MonthView events={mockEvents} selectedDate={selectedDate} />);
    
    const selectedDay = screen.getByTestId(`day-${year}-${month}-15`);
    expect(selectedDay).toHaveClass('bg-blue-100');
  });

  it('今日の日付が特別な表示になる', () => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    
    render(<MonthView events={[]} />);
    
    // 今日の日付セルを探す（存在する場合）
    const todayCell = screen.queryByTestId(`day-${todayKey}`);
    if (todayCell) {
      expect(todayCell).toHaveClass('bg-blue-50');
      expect(todayCell).toHaveClass('ring-2');
      expect(todayCell).toHaveClass('ring-blue-400');
    }
  });

  it('イベントホバー時にツールチップが表示される', async () => {
    render(<MonthView events={mockEvents} />);
    
    const event = screen.getByTestId('event-1');
    
    // ホバー開始
    fireEvent.mouseEnter(event);
    
    // title属性でツールチップ内容を確認
    expect(event).toHaveAttribute('title', 'プロジェクトA');
    
    // ホバー終了
    fireEvent.mouseLeave(event);
  });
});