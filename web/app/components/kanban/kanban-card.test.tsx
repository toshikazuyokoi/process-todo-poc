import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KanbanCard } from './kanban-card';
import { StepInstance, User } from '@/app/types';

// Mock @dnd-kit/sortable
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

describe('KanbanCard', () => {
  const mockStep: StepInstance = {
    id: 1,
    caseId: 100,
    templateId: 1,
    name: 'Test Task',
    dueDateUtc: '2024-01-15T00:00:00Z',
    status: 'todo',
    locked: false,
    assigneeId: 1,
  };

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  };

  describe('Card Information Display', () => {
    it('should display step name', () => {
      render(<KanbanCard step={mockStep} />);
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should display due date when available', () => {
      render(<KanbanCard step={mockStep} />);
      expect(screen.getByText('2024/01/15')).toBeInTheDocument();
    });

    it('should not display due date section when not available', () => {
      const stepWithoutDueDate = { ...mockStep, dueDateUtc: null };
      render(<KanbanCard step={stepWithoutDueDate} />);
      
      const calendarIcons = screen.queryAllByTitle('Calendar');
      expect(calendarIcons).toHaveLength(0);
    });

    it('should display assignee name when provided', () => {
      render(<KanbanCard step={mockStep} assignee={mockUser} />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should not display assignee section when not provided', () => {
      render(<KanbanCard step={mockStep} />);
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    it('should display case ID', () => {
      render(<KanbanCard step={mockStep} />);
      expect(screen.getByText('Case #100')).toBeInTheDocument();
    });

    it('should display lock icon when step is locked', () => {
      const lockedStep = { ...mockStep, locked: true };
      render(<KanbanCard step={lockedStep} />);
      
      const lockIcon = screen.getByTitle('Locked');
      expect(lockIcon).toBeInTheDocument();
    });

    it('should not display lock icon when step is not locked', () => {
      render(<KanbanCard step={mockStep} />);
      
      const lockIcon = screen.queryByTitle('Locked');
      expect(lockIcon).not.toBeInTheDocument();
    });
  });

  describe('Priority Indicators', () => {
    it('should show overdue priority for past due dates', () => {
      const overdueStep = {
        ...mockStep,
        dueDateUtc: '2020-01-01T00:00:00Z',
      };
      render(<KanbanCard step={overdueStep} />);
      expect(screen.getByText('期限切れ')).toBeInTheDocument();
    });

    it('should show high priority for tasks due within 3 days', () => {
      const today = new Date();
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(today.getDate() + 2);
      
      const highPriorityStep = {
        ...mockStep,
        dueDateUtc: twoDaysFromNow.toISOString(),
      };
      render(<KanbanCard step={highPriorityStep} />);
      expect(screen.getByText('高')).toBeInTheDocument();
    });

    it('should show medium priority for tasks due within 7 days', () => {
      const today = new Date();
      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);
      
      const mediumPriorityStep = {
        ...mockStep,
        dueDateUtc: fiveDaysFromNow.toISOString(),
      };
      render(<KanbanCard step={mediumPriorityStep} />);
      expect(screen.getByText('中')).toBeInTheDocument();
    });

    it('should show low priority for tasks due after 7 days', () => {
      const today = new Date();
      const tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(today.getDate() + 10);
      
      const lowPriorityStep = {
        ...mockStep,
        dueDateUtc: tenDaysFromNow.toISOString(),
      };
      render(<KanbanCard step={lowPriorityStep} />);
      // Low priority doesn't show a label
      expect(screen.queryByText('低')).not.toBeInTheDocument();
    });

    it('should apply correct border color based on priority', () => {
      const overdueStep = {
        ...mockStep,
        dueDateUtc: '2020-01-01T00:00:00Z',
      };
      const { container } = render(<KanbanCard step={overdueStep} />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-red-500');
    });
  });

  describe('Drag State', () => {
    it('should apply dragging styles when isDragging is true', () => {
      const { container } = render(<KanbanCard step={mockStep} isDragging={true} />);
      const card = container.firstChild;
      expect(card).toHaveStyle({ opacity: '1' }); // Based on the inline style
    });

    it('should have cursor-move class for draggable cards', () => {
      const { container } = render(<KanbanCard step={mockStep} />);
      const card = container.firstChild;
      expect(card).toHaveClass('cursor-move');
    });
  });
});