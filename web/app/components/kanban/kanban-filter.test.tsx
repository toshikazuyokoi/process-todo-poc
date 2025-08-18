import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KanbanFilter, FilterOptions } from './kanban-filter';
import { User } from '@/app/types';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('KanbanFilter', () => {
  const mockUsers: User[] = [
    { id: 1, email: 'user1@example.com', name: 'User One', role: 'USER' },
    { id: 2, email: 'user2@example.com', name: 'User Two', role: 'USER' },
    { id: 3, email: 'admin@example.com', name: 'Admin User', role: 'ADMIN' },
  ];

  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  });

  describe('Filter Application Logic', () => {
    it('should toggle assignee filter', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Select a user
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            assignees: [1],
            priority: [],
            dueDate: null,
          })
        );
      });
    });

    it('should toggle priority filter', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Select a priority
      const highPriorityButton = screen.getByText('高');
      fireEvent.click(highPriorityButton);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            assignees: [],
            priority: ['high'],
            dueDate: null,
          })
        );
      });
    });

    it('should set due date filter', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Select due date filter
      const dueDateSelect = screen.getByRole('combobox');
      fireEvent.change(dueDateSelect, { target: { value: 'week' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            assignees: [],
            priority: [],
            dueDate: 'week',
          })
        );
      });
    });

    it('should handle unassigned filter', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Select unassigned
      const unassignedCheckbox = screen.getByLabelText('Unassigned');
      fireEvent.click(unassignedCheckbox);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            assignees: [-1],
            priority: [],
            dueDate: null,
          })
        );
      });
    });
  });

  describe('Composite Filter Tests', () => {
    it('should apply multiple filters simultaneously', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Select multiple filters
      const user1Checkbox = screen.getByLabelText('User One');
      fireEvent.click(user1Checkbox);

      const user2Checkbox = screen.getByLabelText('User Two');
      fireEvent.click(user2Checkbox);

      const highPriorityButton = screen.getByText('高');
      fireEvent.click(highPriorityButton);

      const dueDateSelect = screen.getByRole('combobox');
      fireEvent.change(dueDateSelect, { target: { value: 'overdue' } });

      await waitFor(() => {
        const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1];
        expect(lastCall[0]).toEqual({
          assignees: [1, 2],
          priority: ['high'],
          dueDate: 'overdue',
        });
      });
    });

    it('should clear all filters', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply some filters
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      const highPriorityButton = screen.getByText('高');
      fireEvent.click(highPriorityButton);

      // Clear all filters
      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      await waitFor(() => {
        const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1];
        expect(lastCall[0]).toEqual({
          assignees: [],
          priority: [],
          dueDate: null,
        });
      });
    });

    it('should remove individual filters', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply filters
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      const highPriorityButton = screen.getByText('高');
      fireEvent.click(highPriorityButton);

      // Remove user filter by clicking checkbox again
      fireEvent.click(userCheckbox);

      await waitFor(() => {
        const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1];
        expect(lastCall[0]).toEqual({
          assignees: [],
          priority: ['high'],
          dueDate: null,
        });
      });
    });
  });

  describe('UI State Tests', () => {
    it('should show filter count badge when filters are active', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply filters
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      const highPriorityButton = screen.getByText('高');
      fireEvent.click(highPriorityButton);

      // Check for badge
      await waitFor(() => {
        const badge = screen.getByText('2'); // 1 user + 1 priority
        expect(badge).toHaveClass('bg-blue-500');
      });
    });

    it('should toggle filter dropdown visibility', () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Initially closed
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();

      // Open dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);
      expect(screen.getByText('Filters')).toBeInTheDocument();

      // Close dropdown
      const closeButton = screen.getByLabelText('Close filters');
      fireEvent.click(closeButton);
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('should display active filters summary', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply filters
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      // Check for filter summary - use getAllByText since "User One" appears in both checkbox and summary
      await waitFor(() => {
        const userOneElements = screen.getAllByText('User One');
        // The filter summary is the second occurrence (first is in the checkbox label)
        const filterSummary = userOneElements[1].closest('span');
        expect(filterSummary).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('URL Synchronization', () => {
    it('should update URL when filters change', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply filter
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('?assignees=1');
      });
    });

    it('should load filters from URL on mount', () => {
      // Set initial URL params
      mockSearchParams.set('assignees', '1,2');
      mockSearchParams.set('priority', 'high,medium');
      mockSearchParams.set('dueDate', 'week');

      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Verify filters were loaded
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        assignees: [1, 2],
        priority: ['high', 'medium'],
        dueDate: 'week',
      });
    });

    it('should clear URL params when all filters are cleared', async () => {
      render(
        <KanbanFilter
          users={mockUsers}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open filter dropdown
      const filterButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(filterButton);

      // Apply filter
      const userCheckbox = screen.getByLabelText('User One');
      fireEvent.click(userCheckbox);

      // Clear all
      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      await waitFor(() => {
        const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1];
        expect(lastCall[0]).toBe(window.location.pathname);
      });
    });
  });
});