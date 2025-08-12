import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast, toast } from '../toast';

// Test component that uses the toast hook
const TestComponent: React.FC = () => {
  const { addToast, removeToast, clearToasts, toasts } = useToast();

  return (
    <div>
      <button 
        onClick={() => addToast({ 
          type: 'success', 
          title: 'Success!', 
          message: 'Operation completed' 
        })}
      >
        Add Success Toast
      </button>
      <button 
        onClick={() => addToast({ 
          type: 'error', 
          title: 'Error!', 
          message: 'Something went wrong' 
        })}
      >
        Add Error Toast
      </button>
      <button 
        onClick={() => addToast({ 
          type: 'warning', 
          title: 'Warning!',
          duration: 0 // No auto-dismiss
        })}
      >
        Add Warning Toast
      </button>
      <button 
        onClick={() => addToast({ 
          type: 'info', 
          title: 'Info',
          action: {
            label: 'Learn More',
            onClick: jest.fn()
          }
        })}
      >
        Add Info Toast
      </button>
      <button onClick={clearToasts}>Clear All</button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
};

describe('Toast System', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should throw error when useToast is used outside provider', () => {
      const TestErrorComponent = () => {
        expect(() => useToast()).toThrow('useToast must be used within a ToastProvider');
        return null;
      };

      render(<TestErrorComponent />);
    });
  });

  describe('Toast Operations', () => {
    it('should add success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    it('should add error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Error Toast'));

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should add warning toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Warning Toast'));

      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should add info toast with action', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Info Toast'));

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('should display multiple toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      fireEvent.click(screen.getByText('Add Error Toast'));
      fireEvent.click(screen.getByText('Add Warning Toast'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should remove toast when close button is clicked', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      expect(screen.getByText('Success!')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /閉じる/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should clear all toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      fireEvent.click(screen.getByText('Add Error Toast'));
      fireEvent.click(screen.getByText('Add Warning Toast'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByText('Clear All'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.queryByText('Error!')).not.toBeInTheDocument();
      expect(screen.queryByText('Warning!')).not.toBeInTheDocument();
    });

    it('should auto-dismiss toast after duration', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      expect(screen.getByText('Success!')).toBeInTheDocument();

      // Default duration is 5000ms
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      });
    });

    it('should not auto-dismiss when duration is 0', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Warning Toast'));
      expect(screen.getByText('Warning!')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should execute action callback when action button is clicked', () => {
      const actionCallback = jest.fn();
      
      const TestActionComponent = () => {
        const { addToast } = useToast();
        return (
          <button 
            onClick={() => addToast({
              type: 'info',
              title: 'Test',
              action: {
                label: 'Action',
                onClick: actionCallback
              }
            })}
          >
            Add Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestActionComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      fireEvent.click(screen.getByText('Action'));

      expect(actionCallback).toHaveBeenCalled();
    });
  });

  describe('Toast Styling', () => {
    it('should apply success toast styles', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      
      const toastElement = screen.getByText('Success!').closest('div');
      expect(toastElement).toHaveClass('border-green-200');
    });

    it('should apply error toast styles', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Error Toast'));
      
      const toastElement = screen.getByText('Error!').closest('div');
      expect(toastElement).toHaveClass('border-red-200');
    });

    it('should apply warning toast styles', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Warning Toast'));
      
      const toastElement = screen.getByText('Warning!').closest('div');
      expect(toastElement).toHaveClass('border-yellow-200');
    });

    it('should apply info toast styles', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Info Toast'));
      
      const toastElement = screen.getByText('Info').closest('div');
      expect(toastElement).toHaveClass('border-blue-200');
    });
  });

  describe('Toast Icons', () => {
    it('should display correct icon for success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      
      const icon = document.querySelector('.text-green-500');
      expect(icon).toBeInTheDocument();
    });

    it('should display correct icon for error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Error Toast'));
      
      const icon = document.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });

    it('should display correct icon for warning toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Warning Toast'));
      
      const icon = document.querySelector('.text-yellow-500');
      expect(icon).toBeInTheDocument();
    });

    it('should display correct icon for info toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Info Toast'));
      
      const icon = document.querySelector('.text-blue-500');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Toast Animation', () => {
    it('should animate toast entrance', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      
      const toastElement = screen.getByText('Success!').closest('div');
      
      // Initially should have opacity-0 class (before animation)
      expect(toastElement).toHaveClass('transition-all');
      
      // After animation delay
      act(() => {
        jest.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(toastElement).toHaveClass('opacity-100');
      });
    });
  });
});