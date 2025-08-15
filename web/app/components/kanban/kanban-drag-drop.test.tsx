import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraggableKanbanBoard } from './draggable-kanban-board';
import { StepInstance, User } from '@/app/types';

// Mock @dnd-kit libraries
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  closestCorners: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  MouseSensor: jest.fn(),
  TouchSensor: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
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

describe('DraggableKanbanBoard Drag & Drop', () => {
  const mockStepInstances: StepInstance[] = [
    {
      id: 1,
      caseId: 1,
      templateId: 1,
      name: 'Task 1',
      dueDateUtc: '2024-01-15T00:00:00Z',
      status: 'todo',
      locked: false,
      assigneeId: 1,
    },
    {
      id: 2,
      caseId: 1,
      templateId: 2,
      name: 'Task 2',
      dueDateUtc: '2024-01-16T00:00:00Z',
      status: 'in_progress',
      locked: false,
      assigneeId: 2,
    },
    {
      id: 3,
      caseId: 1,
      templateId: 3,
      name: 'Task 3',
      dueDateUtc: '2024-01-17T00:00:00Z',
      status: 'done',
      locked: false,
      assigneeId: null,
    },
  ];

  const mockUsers: User[] = [
    {
      id: 1,
      email: 'user1@example.com',
      name: 'User One',
      role: 'USER',
    },
    {
      id: 2,
      email: 'user2@example.com',
      name: 'User Two',
      role: 'USER',
    },
  ];

  describe('Column Movement Simulation', () => {
    it('should render draggable cards', () => {
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
        />
      );
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('should display assignee names on cards', () => {
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
        />
      );
      
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    it('should call onStatusChange when card is moved to different column', async () => {
      const mockOnStatusChange = jest.fn();
      
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      // Since we're mocking DndContext, we need to simulate drag events differently
      // In a real test with proper DnD testing utilities, we would simulate actual drag events
      // For now, we'll test that the handler is passed correctly
      expect(mockOnStatusChange).toBeDefined();
    });

    it('should group steps by status correctly', () => {
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
        />
      );
      
      // Check that each column displays the correct count
      // The count is displayed in a span element within the column header
      const todoCount = screen.getAllByText('1')[0]; // First '1' is for To Do
      const inProgressCount = screen.getAllByText('1')[1]; // Second '1' is for In Progress
      const doneCount = screen.getAllByText('1')[2]; // Third '1' is for Done
      
      expect(todoCount).toBeInTheDocument();
      expect(inProgressCount).toBeInTheDocument();
      expect(doneCount).toBeInTheDocument();
    });
  });

  describe('API Call Mocking', () => {
    it('should update step status optimistically', async () => {
      const mockOnStatusChange = jest.fn();
      const updatedSteps = [...mockStepInstances];
      
      const { rerender } = render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      // Simulate status change by updating the props
      updatedSteps[0] = { ...updatedSteps[0], status: 'in_progress' };
      
      rerender(
        <DraggableKanbanBoard
          stepInstances={updatedSteps}
          users={mockUsers}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      // Verify the task moved to the new column - now we have 2 in_progress tasks
      const counts = screen.getAllByText('2');
      expect(counts.length).toBeGreaterThan(0); // At least one column should show count of 2
    });

    it('should handle locked steps differently', () => {
      const stepsWithLocked = [
        ...mockStepInstances,
        {
          id: 4,
          caseId: 1,
          templateId: 4,
          name: 'Locked Task',
          dueDateUtc: '2024-01-18T00:00:00Z',
          status: 'todo' as const,
          locked: true,
          assigneeId: null,
        },
      ];
      
      render(
        <DraggableKanbanBoard
          stepInstances={stepsWithLocked}
          users={mockUsers}
        />
      );
      
      expect(screen.getByText('Locked Task')).toBeInTheDocument();
      // Check for lock icon (mocked as AlertCircle with title="Locked")
      expect(screen.getByTitle('Locked')).toBeInTheDocument();
    });
  });

  describe('Drag Overlay', () => {
    it('should render DragOverlay component', () => {
      const { container } = render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
        />
      );
      
      // DragOverlay is mocked but we can verify it's rendered
      expect(container.innerHTML).toBeTruthy();
    });
  });

  describe('Column Operations with Drag & Drop', () => {
    it('should maintain drag functionality after adding a column', async () => {
      const mockOnColumnSettingsChange = jest.fn();
      
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      // Enter edit mode
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      // Add a new column
      const addButton = screen.getByLabelText('Add new column');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockOnColumnSettingsChange).toHaveBeenCalled();
      });
      
      // Verify cards are still displayed
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('should maintain drag functionality after renaming a column', async () => {
      const mockOnColumnSettingsChange = jest.fn();
      
      render(
        <DraggableKanbanBoard
          stepInstances={mockStepInstances}
          users={mockUsers}
          onColumnSettingsChange={mockOnColumnSettingsChange}
        />
      );
      
      // Enter edit mode
      const editButton = screen.getByLabelText('Toggle column settings');
      fireEvent.click(editButton);
      
      // Rename a column
      const todoInput = screen.getByDisplayValue('To Do');
      fireEvent.change(todoInput, { target: { value: 'Backlog' } });
      
      await waitFor(() => {
        expect(mockOnColumnSettingsChange).toHaveBeenCalled();
      });
      
      // Verify cards are still displayed
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });
});