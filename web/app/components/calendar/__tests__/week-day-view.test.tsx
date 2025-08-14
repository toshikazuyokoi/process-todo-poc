import { render, screen, fireEvent } from '@testing-library/react';
import { WeekDayView } from '../week-day-view';
import { format, startOfWeek, endOfWeek, addHours } from 'date-fns';
import { ja } from 'date-fns/locale';
import '@testing-library/jest-dom';

describe('WeekDayView', () => {
  const currentDate = new Date();
  const mockEvents = [
    {
      id: '1',
      title: 'ミーティング',
      start: addHours(startOfWeek(currentDate, { locale: ja }), 10), // 月曜10:00
      end: addHours(startOfWeek(currentDate, { locale: ja }), 11),
      extendedProps: {
        caseId: 1,
        status: 'in_progress',
        type: 'case' as const,
      },
    },
    {
      id: '2',
      title: 'レビュー',
      start: addHours(startOfWeek(currentDate, { locale: ja }), 34), // 火曜10:00
      extendedProps: {
        stepId: 1,
        status: 'pending',
        type: 'step' as const,
        assignee: '田中',
      },
    },
    {
      id: '3',
      title: '作業',
      start: addHours(startOfWeek(currentDate, { locale: ja }), 58), // 水曜10:00
      extendedProps: {
        stepId: 2,
        status: 'completed',
        type: 'step' as const,
      },
    },
  ];

  describe('週表示モード', () => {
    it('週表示が正しくレンダリングされる', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      // 曜日が表示される
      expect(screen.getByText('日')).toBeInTheDocument();
      expect(screen.getByText('月')).toBeInTheDocument();
      expect(screen.getByText('火')).toBeInTheDocument();
      expect(screen.getByText('水')).toBeInTheDocument();
      expect(screen.getByText('木')).toBeInTheDocument();
      expect(screen.getByText('金')).toBeInTheDocument();
      expect(screen.getByText('土')).toBeInTheDocument();
    });

    it('時間軸が表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      // 時間ラベルの確認（7:00-21:00）
      expect(screen.getByText('7:00')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
      expect(screen.getByText('21:00')).toBeInTheDocument();
    });

    it('週の日付範囲が正しく表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const weekStart = startOfWeek(currentDate, { locale: ja });
      const weekEnd = endOfWeek(currentDate, { locale: ja });
      
      const startText = format(weekStart, 'yyyy年 M月 d日', { locale: ja });
      const endText = format(weekEnd, 'd日', { locale: ja });
      
      expect(screen.getByText(new RegExp(startText))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(endText))).toBeInTheDocument();
    });

    it('イベントが正しい時間帯に表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      // イベントが表示される
      expect(screen.getByTestId('event-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-2')).toBeInTheDocument();
      expect(screen.getByTestId('event-3')).toBeInTheDocument();
      
      // イベントのタイトルが表示される
      expect(screen.getByTestId('event-1')).toHaveTextContent('ミーティング');
      expect(screen.getByTestId('event-2')).toHaveTextContent('レビュー');
    });

    it('前週・次週ナビゲーションが機能する', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const prevButton = screen.getByLabelText('前週');
      const nextButton = screen.getByLabelText('次週');
      
      const initialWeek = startOfWeek(currentDate, { locale: ja });
      const initialText = format(initialWeek, 'yyyy年 M月 d日', { locale: ja });
      
      // 初期表示の確認
      expect(screen.getByText(new RegExp(initialText))).toBeInTheDocument();
      
      // 次週へ移動
      fireEvent.click(nextButton);
      
      // 前週へ戻る
      fireEvent.click(prevButton);
      expect(screen.getByText(new RegExp(initialText))).toBeInTheDocument();
    });
  });

  describe('日表示モード', () => {
    it('日表示が正しくレンダリングされる', () => {
      render(<WeekDayView events={mockEvents} viewMode="day" />);
      
      // 現在日の曜日と日付が表示される
      const dayText = format(currentDate, 'yyyy年 M月 d日 (E)', { locale: ja });
      expect(screen.getByText(dayText)).toBeInTheDocument();
    });

    it('1日分の時間軸のみ表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="day" />);
      
      // 時間軸は表示される
      expect(screen.getByText('9:00')).toBeInTheDocument();
      expect(screen.getByText('15:00')).toBeInTheDocument();
      
      // 日付セルは1つだけ
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      expect(screen.getByTestId(`slot-${dateKey}-9`)).toBeInTheDocument();
    });

    it('前日・次日ナビゲーションが機能する', () => {
      render(<WeekDayView events={mockEvents} viewMode="day" />);
      
      const prevButton = screen.getByLabelText('前日');
      const nextButton = screen.getByLabelText('次日');
      
      const initialText = format(currentDate, 'yyyy年 M月 d日', { locale: ja });
      
      // 次日へ移動
      fireEvent.click(nextButton);
      
      // 前日へ戻る
      fireEvent.click(prevButton);
      expect(screen.getByText(new RegExp(initialText))).toBeInTheDocument();
    });
  });

  describe('イベント操作', () => {
    it('イベントクリック時にコールバックが呼ばれる', () => {
      const handleEventClick = jest.fn();
      render(
        <WeekDayView 
          events={mockEvents} 
          viewMode="week" 
          onEventClick={handleEventClick}
        />
      );
      
      fireEvent.click(screen.getByTestId('event-1'));
      
      expect(handleEventClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'ミーティング',
        })
      );
    });

    it('時間スロットクリック時にコールバックが呼ばれる', () => {
      const handleTimeSlotClick = jest.fn();
      render(
        <WeekDayView 
          events={mockEvents} 
          viewMode="week" 
          onTimeSlotClick={handleTimeSlotClick}
        />
      );
      
      const weekStart = startOfWeek(currentDate, { locale: ja });
      const dateKey = format(weekStart, 'yyyy-MM-dd');
      const slot = screen.getByTestId(`slot-${dateKey}-10`);
      
      fireEvent.click(slot);
      
      expect(handleTimeSlotClick).toHaveBeenCalledWith(expect.any(Date));
      const callDate = handleTimeSlotClick.mock.calls[0][0];
      expect(callDate.getHours()).toBe(10);
    });

    it('イベントホバー時にツールチップが表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const event = screen.getByTestId('event-1');
      
      // ホバー開始
      fireEvent.mouseEnter(event);
      
      // ツールチップが表示される
      expect(screen.getByText('ミーティング')).toBeInTheDocument();
      
      // ホバー終了
      fireEvent.mouseLeave(event);
    });
  });

  describe('ビジネスアワー', () => {
    it('ビジネスアワーが背景色で区別される', () => {
      render(
        <WeekDayView 
          events={[]} 
          viewMode="week"
          businessHours={{ start: 9, end: 18 }}
        />
      );
      
      const weekStart = startOfWeek(currentDate, { locale: ja });
      const dateKey = format(weekStart, 'yyyy-MM-dd');
      
      // ビジネスアワー内（9:00）
      const businessSlot = screen.getByTestId(`slot-${dateKey}-9`);
      expect(businessSlot).toHaveClass('bg-white');
      
      // ビジネスアワー外（7:00）
      const nonBusinessSlot = screen.getByTestId(`slot-${dateKey}-7`);
      expect(nonBusinessSlot).toHaveClass('bg-gray-50');
    });

    it('カスタムビジネスアワーが適用される', () => {
      render(
        <WeekDayView 
          events={[]} 
          viewMode="week"
          businessHours={{ start: 10, end: 17 }}
        />
      );
      
      const weekStart = startOfWeek(currentDate, { locale: ja });
      const dateKey = format(weekStart, 'yyyy-MM-dd');
      
      // カスタムビジネスアワー内（10:00）
      const businessSlot = screen.getByTestId(`slot-${dateKey}-10`);
      expect(businessSlot).toHaveClass('bg-white');
      
      // カスタムビジネスアワー外（9:00）
      const nonBusinessSlot = screen.getByTestId(`slot-${dateKey}-9`);
      expect(nonBusinessSlot).toHaveClass('bg-gray-50');
    });
  });

  describe('ステータス色分け', () => {
    it('ステータスに応じた色分けが適用される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const event1 = screen.getByTestId('event-1');
      const event2 = screen.getByTestId('event-2');
      const event3 = screen.getByTestId('event-3');
      
      // ステータスごとのクラスが適用されている
      expect(event1).toHaveClass('bg-blue-500'); // in_progress
      expect(event2).toHaveClass('bg-amber-500'); // pending
      expect(event3).toHaveClass('bg-green-500'); // completed
    });

    it('ブロック状態のイベントが赤色で表示される', () => {
      const blockedEvent = {
        id: '4',
        title: 'ブロック中',
        start: new Date(),
        extendedProps: {
          status: 'blocked',
          type: 'step' as const,
        },
      };
      
      render(<WeekDayView events={[blockedEvent]} viewMode="week" />);
      
      const event = screen.getByTestId('event-4');
      expect(event).toHaveClass('bg-red-500');
    });
  });

  describe('今日ボタン', () => {
    it('今日ボタンで現在の週/日に戻る', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const nextButton = screen.getByLabelText('次週');
      const todayButton = screen.getByText('今日');
      
      // 次週へ移動
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      
      // 今日ボタンで戻る
      fireEvent.click(todayButton);
      
      const currentWeek = startOfWeek(new Date(), { locale: ja });
      const currentText = format(currentWeek, 'yyyy年 M月 d日', { locale: ja });
      expect(screen.getByText(new RegExp(currentText))).toBeInTheDocument();
    });
  });

  describe('週末の表示', () => {
    it('週末の日付が色分けされる', () => {
      render(<WeekDayView events={[]} viewMode="week" />);
      
      // 日曜日が赤色
      const sunday = screen.getByText('日').parentElement;
      expect(sunday?.querySelector('.text-red-500')).toBeInTheDocument();
      
      // 土曜日が青色
      const saturday = screen.getByText('土').parentElement;
      expect(saturday?.querySelector('.text-blue-500')).toBeInTheDocument();
    });
  });

  describe('担当者表示', () => {
    it('担当者名が表示される', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const event2 = screen.getByTestId('event-2');
      expect(event2).toHaveTextContent('田中');
    });

    it('担当者がいない場合は表示されない', () => {
      render(<WeekDayView events={mockEvents} viewMode="week" />);
      
      const event1 = screen.getByTestId('event-1');
      expect(event1).not.toHaveTextContent('田中');
    });
  });
});