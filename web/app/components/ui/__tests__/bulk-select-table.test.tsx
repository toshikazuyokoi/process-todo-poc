import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkSelectTable } from '../bulk-select-table';

describe('BulkSelectTable', () => {
  const mockItems = [
    { id: 1, name: 'Item 1', status: 'active', created: '2025-01-01' },
    { id: 2, name: 'Item 2', status: 'pending', created: '2025-01-02' },
    { id: 3, name: 'Item 3', status: 'active', created: '2025-01-03' },
  ];

  const mockColumns = [
    { key: 'name', label: '名前', sortable: true },
    { key: 'status', label: 'ステータス' },
    { key: 'created', label: '作成日', sortable: true },
  ];

  const mockBulkActions = [
    { key: 'delete', label: '削除', variant: 'danger' as const },
    { key: 'export', label: 'エクスポート' },
  ];

  const mockOnBulkAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的な表示', () => {
    it('テーブルが正しくレンダリングされる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('カラムヘッダーが表示される', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
        />
      );

      expect(screen.getByText('名前')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
      expect(screen.getByText('作成日')).toBeInTheDocument();
    });
  });

  describe('選択機能', () => {
    it('個別のアイテムを選択できる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      fireEvent.click(checkboxes[1]); // 最初のアイテムを選択

      expect(screen.getByText('1件選択中')).toBeInTheDocument();
    });

    it('全選択ができる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      const selectAllButton = screen.getByLabelText('全選択');
      fireEvent.click(selectAllButton);

      expect(screen.getByText('3件選択中')).toBeInTheDocument();
    });

    it('Shiftキーで範囲選択ができる', async () => {
      const user = userEvent.setup();
      
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      
      // 最初のアイテムをクリック
      await user.click(checkboxes[1]);
      
      // Shiftを押しながら3番目のアイテムをクリック
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[3]);
      await user.keyboard('{/Shift}');

      expect(screen.getByText('3件選択中')).toBeInTheDocument();
    });

    it('Ctrl/Cmdキーで複数選択ができる', async () => {
      const user = userEvent.setup();
      
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      
      // Ctrlを押しながら複数選択
      await user.keyboard('{Control>}');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[3]);
      await user.keyboard('{/Control}');

      expect(screen.getByText('2件選択中')).toBeInTheDocument();
    });
  });

  describe('一括アクション', () => {
    it('アイテムを選択すると一括アクションバーが表示される', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      fireEvent.click(checkboxes[1]);

      expect(screen.getByText('削除')).toBeInTheDocument();
      expect(screen.getByText('エクスポート')).toBeInTheDocument();
    });

    it('一括アクションボタンをクリックするとコールバックが呼ばれる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      // アイテムを選択
      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      // 削除ボタンをクリック
      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      expect(mockOnBulkAction).toHaveBeenCalledWith('delete', expect.arrayContaining([2]));
    });
  });

  describe('ソート機能', () => {
    it('ソート可能なカラムをクリックするとソートされる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
        />
      );

      const nameHeader = screen.getByText('名前');
      fireEvent.click(nameHeader);

      const items = screen.getAllByText(/Item \d/);
      expect(items[0]).toHaveTextContent('Item 1');
      expect(items[1]).toHaveTextContent('Item 2');
      expect(items[2]).toHaveTextContent('Item 3');
    });

    it('2回クリックすると逆順になる', () => {
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
        />
      );

      const nameHeader = screen.getByText('名前');
      fireEvent.click(nameHeader); // 昇順
      fireEvent.click(nameHeader); // 降順

      const items = screen.getAllByText(/Item \d/);
      expect(items[0]).toHaveTextContent('Item 3');
      expect(items[1]).toHaveTextContent('Item 2');
      expect(items[2]).toHaveTextContent('Item 1');
    });
  });

  describe('キーボード操作', () => {
    it('Ctrl+Aで全選択される', async () => {
      const user = userEvent.setup();
      
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      await user.keyboard('{Control>}a{/Control}');
      
      expect(screen.getByText('3件選択中')).toBeInTheDocument();
    });

    it('Escapeで選択が解除される', async () => {
      const user = userEvent.setup();
      
      render(
        <BulkSelectTable
          items={mockItems}
          columns={mockColumns}
          idKey="id"
          bulkActions={mockBulkActions}
          onBulkAction={mockOnBulkAction}
        />
      );

      // アイテムを選択
      const checkboxes = screen.getAllByRole('button', { name: /選択/ });
      await user.click(checkboxes[1]);
      
      expect(screen.getByText('1件選択中')).toBeInTheDocument();
      
      // Escapeキーで選択解除
      await user.keyboard('{Escape}');
      
      expect(screen.queryByText('1件選択中')).not.toBeInTheDocument();
    });
  });
});