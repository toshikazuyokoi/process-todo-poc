/**
 * Basic Integration Test for AI Agent Components
 * Tests basic rendering and functionality without complex mocks
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import { MessageInput } from '../components/message-input';
import { TypingIndicator } from '../components/typing-indicator';
import { ConfidenceDisplay } from '../components/confidence-display';
import { ProgressIndicator } from '../components/progress-indicator';

describe('AI Agent Components Basic Tests', () => {
  describe('MessageInput Component', () => {
    it('should render message input', () => {
      render(
        <MessageInput 
          onSendMessage={jest.fn()} 
          onTyping={jest.fn()}
          disabled={false}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Type your message...');
      expect(textarea).toBeInTheDocument();
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should be disabled when specified', () => {
      render(
        <MessageInput 
          onSendMessage={jest.fn()} 
          onTyping={jest.fn()}
          disabled={true}
          placeholder="Disabled input"
        />
      );
      
      const textarea = screen.getByPlaceholderText('Disabled input');
      expect(textarea).toBeDisabled();
    });
  });

  describe('TypingIndicator Component', () => {
    it('should render typing indicator', () => {
      render(<TypingIndicator />);
      const text = screen.getByText(/Processing/i);
      expect(text).toBeInTheDocument();
    });

    it('should show stage when provided', () => {
      render(<TypingIndicator stage="thinking" />);
      const text = screen.getByText(/Thinking/i);
      expect(text).toBeInTheDocument();
    });

    it('should show estimated time', () => {
      render(<TypingIndicator estimatedTime={3000} />);
      const text = screen.getByText(/~50m remaining/);
      expect(text).toBeInTheDocument();
    });
  });

  describe('ConfidenceDisplay Component', () => {
    it('should display high confidence correctly', () => {
      render(<ConfidenceDisplay confidence={0.9} />);
      expect(screen.getByText('高信頼度')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('should display medium confidence correctly', () => {
      render(<ConfidenceDisplay confidence={0.7} />);
      expect(screen.getByText('中信頼度')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should display low confidence correctly', () => {
      render(<ConfidenceDisplay confidence={0.3} />);
      expect(screen.getByText('低信頼度')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should respect display options', () => {
      render(
        <ConfidenceDisplay 
          confidence={0.85}
          showLabel={false}
          showBar={false}
        />
      );
      
      expect(screen.queryByText('高信頼度')).not.toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('ProgressIndicator Component', () => {
    it('should render progress indicator', () => {
      const { container } = render(
        <ProgressIndicator 
          isGenerating={true}
          progress={50}
          message="Processing..."
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      // Check progress bar width instead of percentage text
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
      // Check stage label
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should show error state', () => {
      render(
        <ProgressIndicator 
          isGenerating={false}
          error={{
            message: 'Generation failed',
            canRetry: true
          }}
          onRetry={jest.fn()}
        />
      );
      
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show cancel button when generating', () => {
      const { container } = render(
        <ProgressIndicator 
          isGenerating={true}
          progress={25}
          onCancel={jest.fn()}
        />
      );
      
      // Cancel button has only an icon, no text
      const cancelButton = container.querySelector('.text-red-600');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton?.tagName).toBe('BUTTON');
    });
  });
});