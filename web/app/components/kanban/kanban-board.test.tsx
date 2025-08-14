import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KanbanBoard, KanbanColumn } from './kanban-board';
import { StepInstance } from '@/app/types';

describe('KanbanBoard', () => {
  const mockStepInstances: StepInstance[] = [
    {
      id: 1,
      caseId: 1,
      templateId: 1,
      name: 'Task 1',
      dueDateUtc: '2024-01-15T00:00:00Z',
      status: 'todo',
      locked: false,
    },
    {
      id: 2,
      caseId: 1,
      templateId: 2,
      name: 'Task 2',
      dueDateUtc: '2024-01-16T00:00:00Z',
      status: 'in_progress',
      locked: false,
    },
    {
      id: 3,
      caseId: 1,
      templateId: 3,
      name: 'Task 3',
      dueDateUtc: '2024-01-17T00:00:00Z',
      status: 'done',
      locked: false,
    },
    {
      id: 4,
      caseId: 1,
      templateId: 4,
      name: 'Task 4',
      dueDateUtc: null,
      status: 'blocked',
      locked: false,
    },
  ];

  describe('Column Rendering', () => {
    it('should render default columns', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should display correct count for each column', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      // Find counts by looking for the numbers near column titles
      const todoColumn = screen.getByText('To Do').closest('div');
      const inProgressColumn = screen.getByText('In Progress').closest('div');
      const blockedColumn = screen.getByText('Blocked').closest('div');
      const doneColumn = screen.getByText('Done').closest('div');
      
      expect(todoColumn?.parentElement).toHaveTextContent('1');
      expect(inProgressColumn?.parentElement).toHaveTextContent('1');
      expect(blockedColumn?.parentElement).toHaveTextContent('1');
      expect(doneColumn?.parentElement).toHaveTextContent('1');
    });

    it('should render step cards in correct columns', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
      expect(screen.getByText('Task 4')).toBeInTheDocument();
    });

    it('should display due dates when available', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      expect(screen.getByText(/Due:.*1\/15\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/Due:.*1\/16\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/Due:.*1\/17\/2024/)).toBeInTheDocument();
    });
  });

  describe('Column Settings', () => {
    it('should toggle edit mode when Edit Columns button is clicked', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      const editButton = screen.getByLabelText('Toggle column settings');
      expect(editButton).toHaveTextContent('Edit Columns');
      
      fireEvent.click(editButton);
      expect(editButton).toHaveTextContent('Done');
      
      fireEvent.click(editButton);
      expect(editButton).toHaveTextContent('Edit Columns');
    });

    it('should show input fields for column titles in edit mode', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4); // One for each default column
      expect(inputs[0]).toHaveValue('To Do');
      expect(inputs[1]).toHaveValue('In Progress');
    });

    it('should allow renaming columns', async () => {
      const mockOnColumnSettingsChange = jest.fn();
      render(
        <KanbanBoard
          stepInstances={mockStepInstances}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      const todoInput = screen.getByDisplayValue('To Do');
      fireEvent.change(todoInput, { target: { value: 'Backlog' } });
      
      await waitFor(() => {
        expect(mockOnColumnSettingsChange).toHaveBeenCalled();
      });
      
      const lastCall = mockOnColumnSettingsChange.mock.calls[mockOnColumnSettingsChange.mock.calls.length - 1];
      const updatedColumns = lastCall[0];
      expect(updatedColumns[0].title).toBe('Backlog');
    });

    it('should show Add Column button in edit mode', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      expect(screen.queryByLabelText('Add new column')).not.toBeInTheDocument();
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      expect(screen.getByLabelText('Add new column')).toBeInTheDocument();
    });

    it('should add new column when Add Column button is clicked', async () => {
      const mockOnColumnSettingsChange = jest.fn();
      render(
        <KanbanBoard
          stepInstances={mockStepInstances}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      const addButton = screen.getByLabelText('Add new column');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockOnColumnSettingsChange).toHaveBeenCalled();
      });
      
      const lastCall = mockOnColumnSettingsChange.mock.calls[mockOnColumnSettingsChange.mock.calls.length - 1];
      const updatedColumns = lastCall[0];
      expect(updatedColumns).toHaveLength(5); // 4 default + 1 new
      expect(updatedColumns[4].title).toBe('New Column');
    });

    it('should show remove buttons for columns in edit mode', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      expect(screen.queryAllByText('✕')).toHaveLength(0);
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      expect(screen.getAllByText('✕')).toHaveLength(4); // One for each column
    });

    it('should remove column when remove button is clicked', async () => {
      const mockOnColumnSettingsChange = jest.fn();
      render(
        <KanbanBoard
          stepInstances={mockStepInstances}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      const removeButtons = screen.getAllByText('✕');
      fireEvent.click(removeButtons[0]); // Remove first column
      
      await waitFor(() => {
        expect(mockOnColumnSettingsChange).toHaveBeenCalled();
      });
      
      const lastCall = mockOnColumnSettingsChange.mock.calls[mockOnColumnSettingsChange.mock.calls.length - 1];
      const updatedColumns = lastCall[0];
      expect(updatedColumns).toHaveLength(3); // 4 default - 1 removed
      expect(updatedColumns[0].title).toBe('In Progress'); // First was removed
    });

    it('should not allow removing the last column', () => {
      const mockOnColumnSettingsChange = jest.fn();
      render(
        <KanbanBoard
          stepInstances={mockStepInstances}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      // Enter edit mode
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      // Try to remove all columns one by one
      let removeButtons = screen.getAllByText('✕');
      while (removeButtons.length > 1) {
        fireEvent.click(removeButtons[0]); // Always click first remove button
        removeButtons = screen.getAllByText('✕');
      }
      
      // Last column should not have remove button since we can't remove it
      // But it should still exist (check by finding an input field for column name)
      const columnInputs = screen.getAllByRole('textbox');
      expect(columnInputs).toHaveLength(1); // Only one column left
    });
  });

  describe('Responsive Layout', () => {
    it('should have horizontal scroll container', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      const scrollContainer = screen.getByText('To Do').closest('.overflow-x-auto');
      expect(scrollContainer).toHaveClass('overflow-x-auto');
    });

    it('should have fixed width columns', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      const columns = screen.getAllByText(/To Do|In Progress|Blocked|Done/);
      columns.forEach((column) => {
        const columnDiv = column.closest('.w-80');
        expect(columnDiv).toHaveClass('w-80');
      });
    });

    it('should apply correct color classes to columns', () => {
      render(<KanbanBoard stepInstances={mockStepInstances} />);
      
      const todoColumn = screen.getByText('To Do').closest('.bg-gray-100');
      const inProgressColumn = screen.getByText('In Progress').closest('.bg-blue-100');
      const blockedColumn = screen.getByText('Blocked').closest('.bg-red-100');
      const doneColumn = screen.getByText('Done').closest('.bg-green-100');
      
      expect(todoColumn).toHaveClass('bg-gray-100');
      expect(inProgressColumn).toHaveClass('bg-blue-100');
      expect(blockedColumn).toHaveClass('bg-red-100');
      expect(doneColumn).toHaveClass('bg-green-100');
    });
  });
});