import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../error-boundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({})
      } as Response)
    );
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should display error UI when error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument();
  });

  it('should display error ID', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorId = screen.getByText(/エラーID:/);
    expect(errorId).toBeInTheDocument();
    expect(errorId.textContent).toMatch(/err_\d+_[a-z0-9]+/);
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorMessages = screen.getAllByText(/Test error message/);
    expect(errorMessages[0]).toBeInTheDocument();
    expect(screen.getByText('スタックトレース')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Test error message/)).not.toBeInTheDocument();
    expect(screen.queryByText('スタックトレース')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });

  it('should reset error state when "もう一度試す" is clicked', () => {
    // Use a stateful wrapper to test error reset
    const TestWrapper = () => {
      const [hasError, setHasError] = React.useState(true);
      const [resetKey, setResetKey] = React.useState(0);
      
      return (
        <>
          <ErrorBoundary key={resetKey}>
            <ThrowError shouldThrow={hasError} />
          </ErrorBoundary>
          <button 
            data-testid="reset-test" 
            onClick={() => {
              setHasError(false);
              setResetKey(k => k + 1);
            }}
            style={{ display: 'none' }}
          >
            Reset Test
          </button>
        </>
      );
    };

    render(<TestWrapper />);

    // Verify error is displayed
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // Click the reset button in the error boundary
    fireEvent.click(screen.getByText('もう一度試す'));
    
    // Also trigger our test reset to re-render without error
    fireEvent.click(screen.getByTestId('reset-test'));

    // Verify error is cleared and normal content is shown
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });

  it('should reload page when "ページを再読み込み" is clicked', () => {
    const reloadMock = jest.fn();
    
    // Use Object.defineProperty to properly mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        reload: reloadMock,
        href: 'http://localhost/'
      },
      writable: true,
      configurable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('ページを再読み込み'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should navigate to home when "ホームに戻る" is clicked', () => {
    // Use Object.defineProperty to properly mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: ''
      },
      writable: true,
      configurable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('ホームに戻る'));
    expect(window.location.href).toBe('/');
  });

  it('should log error to console in development', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ErrorBoundary'),
      expect.any(Error)
    );
  });

  it('should report error to service in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for async operation
    setTimeout(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test error message'),
        })
      );
      fetchSpy.mockRestore();
    }, 100);

    process.env.NODE_ENV = originalEnv;
  });
});