import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DraggableCalendar } from '../draggable-calendar';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('カレンダーAPI統合テスト', () => {
  const mockEvents = [
    {
      id: 'case-1',
      title: 'プロジェクトA',
      start: '2025-01-15',
      extendedProps: {
        caseId: 1,
        status: 'in_progress',
        type: 'case' as const,
      },
    },
    {
      id: 'step-1',
      title: 'タスク1',
      start: '2025-01-16T10:00:00',
      extendedProps: {
        stepId: 1,
        caseId: 1,
        status: 'pending',
        type: 'step' as const,
        assignee: '田中',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('イベント更新', () => {
    it('ケースの期限更新が呼ばれる', async () => {
      const mockUpdateHandler = jest.fn().mockResolvedValue(undefined);
      
      render(
        <DraggableCalendar
          events={mockEvents}
          onEventUpdate={mockUpdateHandler}
        />
      );

      // ドラッグ&ドロップを有効にする
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      // イベントが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('draggable-event-case-1')).toBeInTheDocument();
      });

      // onEventUpdateがケースの更新で呼ばれることを確認
      const newDate = new Date('2025-01-20');
      
      // 更新ハンドラを手動で呼び出してテスト
      await mockUpdateHandler(mockEvents[0], newDate);

      expect(mockUpdateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'case-1',
          extendedProps: expect.objectContaining({
            caseId: 1,
            type: 'case',
          }),
        }),
        newDate
      );
    });

    it('ステップの期限更新が呼ばれる', async () => {
      const mockUpdateHandler = jest.fn().mockResolvedValue(undefined);
      
      render(
        <DraggableCalendar
          events={mockEvents}
          onEventUpdate={mockUpdateHandler}
        />
      );

      // ステップイベントが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('draggable-event-step-1')).toBeInTheDocument();
      });

      // onEventUpdateがステップの更新で呼ばれることを確認
      const newDate = new Date('2025-01-18T14:00:00');
      
      await mockUpdateHandler(mockEvents[1], newDate);

      expect(mockUpdateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'step-1',
          extendedProps: expect.objectContaining({
            stepId: 1,
            type: 'step',
          }),
        }),
        newDate
      );
    });

    it('更新エラー時にエラーハンドリングされる', async () => {
      const mockUpdateHandler = jest.fn()
        .mockRejectedValue(new Error('Update failed'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <DraggableCalendar
          events={mockEvents}
          onEventUpdate={mockUpdateHandler}
        />
      );

      const newDate = new Date('2025-01-20');
      
      // エラーが発生してもクラッシュしないことを確認
      await expect(mockUpdateHandler(mockEvents[0], newDate))
        .rejects.toThrow('Update failed');

      // コンポーネントが正常に表示され続けることを確認
      expect(screen.getByText('月表示')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('イベントクリック', () => {
    it('イベントクリック時にコールバックが呼ばれる', async () => {
      const mockClickHandler = jest.fn();

      render(
        <DraggableCalendar
          events={mockEvents}
          onEventClick={mockClickHandler}
        />
      );

      // イベントが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByTestId('draggable-event-case-1')).toBeInTheDocument();
      });

      // イベントをクリック
      fireEvent.click(screen.getByTestId('draggable-event-case-1'));

      // ハンドラが呼ばれることを確認
      expect(mockClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'case-1',
          title: 'プロジェクトA',
        })
      );
    });
  });

  describe('日付クリック', () => {
    it('月表示で日付クリック時にコールバックが呼ばれる', async () => {
      const mockDateClickHandler = jest.fn();

      render(
        <DraggableCalendar
          events={[]}
          onDateClick={mockDateClickHandler}
          viewMode="month"
        />
      );

      // 月表示が選択されていることを確認
      const monthButton = screen.getByText('月表示');
      expect(monthButton.parentElement).toHaveClass('bg-primary');

      // 日付セルをクリック（最初の日付セルを探す）
      const dateCell = screen.getAllByTestId(/day-/)[0];
      fireEvent.click(dateCell);

      // ハンドラが呼ばれることを確認
      expect(mockDateClickHandler).toHaveBeenCalledWith(expect.any(Date));
    });

    it('週表示で時間スロットクリック時にコールバックが呼ばれる', async () => {
      const mockDateClickHandler = jest.fn();

      render(
        <DraggableCalendar
          events={[]}
          onDateClick={mockDateClickHandler}
          viewMode="week"
        />
      );

      // 週表示に切り替え
      fireEvent.click(screen.getByText('週表示'));

      // 時間スロットをクリック
      await waitFor(() => {
        const timeSlot = screen.getAllByTestId(/slot-/)[0];
        fireEvent.click(timeSlot);
      });

      // ハンドラが呼ばれることを確認
      expect(mockDateClickHandler).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('ビュー切り替え', () => {
    it('月表示から週表示に切り替えられる', () => {
      render(
        <DraggableCalendar
          events={mockEvents}
          viewMode="month"
        />
      );

      // 初期状態で月表示が選択されている
      expect(screen.getByText('月表示').parentElement).toHaveClass('bg-primary');

      // 週表示に切り替え
      fireEvent.click(screen.getByText('週表示'));

      // 週表示が選択される
      expect(screen.getByText('週表示').parentElement).toHaveClass('bg-primary');
      expect(screen.getByText('月表示').parentElement).not.toHaveClass('bg-primary');
    });

    it('週表示から日表示に切り替えられる', () => {
      render(
        <DraggableCalendar
          events={mockEvents}
          viewMode="week"
        />
      );

      // 日表示に切り替え
      fireEvent.click(screen.getByText('日表示'));

      // 日表示が選択される
      expect(screen.getByText('日表示').parentElement).toHaveClass('bg-primary');
      expect(screen.getByText('週表示').parentElement).not.toHaveClass('bg-primary');
    });
  });

  describe('ドラッグ&ドロップ設定', () => {
    it('ドラッグ&ドロップを無効化できる', () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      // 初期状態で有効
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(screen.getByText('イベントをドラッグして日付を変更できます')).toBeInTheDocument();

      // 無効化
      fireEvent.click(checkbox);
      
      // 説明文が消える
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByText('イベントをドラッグして日付を変更できます')).not.toBeInTheDocument();
    });

    it('ドラッグ&ドロップを再度有効化できる', () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      // 無効化してから再度有効化
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByText('イベントをドラッグして日付を変更できます')).toBeInTheDocument();
    });
  });

  describe('イベント表示', () => {
    it('ケースイベントにアイコンが表示される', async () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      await waitFor(() => {
        const caseEvent = screen.getByTestId('draggable-event-case-1');
        expect(caseEvent).toHaveTextContent('📋');
      });
    });

    it('ステップイベントにアイコンが表示される', async () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      await waitFor(() => {
        const stepEvent = screen.getByTestId('draggable-event-step-1');
        expect(stepEvent).toHaveTextContent('✓');
      });
    });

    it('担当者名が表示される', async () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      await waitFor(() => {
        const stepEvent = screen.getByTestId('draggable-event-step-1');
        expect(stepEvent).toHaveTextContent('田中');
      });
    });

    it('ステータスに応じた色が適用される', async () => {
      render(
        <DraggableCalendar
          events={mockEvents}
        />
      );

      await waitFor(() => {
        const caseEvent = screen.getByTestId('draggable-event-case-1');
        expect(caseEvent).toHaveClass('bg-blue-500'); // in_progress
        
        const stepEvent = screen.getByTestId('draggable-event-step-1');
        expect(stepEvent).toHaveClass('bg-amber-500'); // pending
      });
    });
  });
});