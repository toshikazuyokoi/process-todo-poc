import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableStepsList } from '../sortable-steps-list';

describe('SortableStepsList', () => {
  const mockSteps = [
    {
      id: 1,
      name: 'ステップ1',
      description: 'テスト説明1',
      requiredDays: 3,
      bufferDays: 1,
      order: 1,
    },
    {
      id: 2,
      name: 'ステップ2',
      description: 'テスト説明2',
      requiredDays: 5,
      bufferDays: 2,
      order: 2,
    },
  ];

  const mockHandlers = {
    onReorder: jest.fn(),
    onAdd: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('ステップリストが正しく表示される', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('ステップ1')).toBeInTheDocument();
      expect(screen.getByText('ステップ2')).toBeInTheDocument();
    });

    it('空のリストの場合、適切なメッセージが表示される', () => {
      render(
        <SortableStepsList
          steps={[]}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('ステップがまだありません')).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('追加ボタンをクリックするとonAddが呼ばれる', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      const addButton = screen.getByText('ステップを追加');
      fireEvent.click(addButton);

      expect(mockHandlers.onAdd).toHaveBeenCalledTimes(1);
    });

    it('編集ボタンをクリックするとonEditが呼ばれる', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      const editButtons = screen.getAllByLabelText(/編集/);
      fireEvent.click(editButtons[0]);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockSteps[0]);
    });

    it('削除ボタンをクリックするとonDeleteが呼ばれる', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/削除/);
      fireEvent.click(deleteButtons[0]);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('ドラッグ&ドロップ', () => {
    it('ドラッグハンドルが表示される', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      const dragHandles = screen.getAllByLabelText('ドラッグして順序を変更');
      expect(dragHandles).toHaveLength(2);
    });

    // Note: @dnd-kit のドラッグ&ドロップの完全なテストは
    // E2Eテストで行うのが推奨されます
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
      render(
        <SortableStepsList
          steps={mockSteps}
          {...mockHandlers}
        />
      );

      const dragHandles = screen.getAllByLabelText('ドラッグして順序を変更');
      dragHandles.forEach(handle => {
        expect(handle).toHaveAttribute('aria-label');
      });
    });
  });
});