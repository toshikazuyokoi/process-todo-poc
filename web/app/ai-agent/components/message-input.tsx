'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { clsx } from 'clsx';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

/**
 * Message Input Component
 * Text input area with send button and typing indicator
 */
export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 4000,
  className = '',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle message change
   */
  const handleChange = (value: string) => {
    if (value.length > maxLength) return;
    
    setMessage(value);

    // Handle typing indicator
    if (onTyping) {
      if (!isTyping && value.trim()) {
        setIsTyping(true);
        onTyping(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      if (value.trim()) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTyping(false);
        }, 1500);
      } else {
        setIsTyping(false);
        onTyping(false);
      }
    }
  };

  /**
   * Handle send message
   */
  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Stop typing indicator
    if (onTyping) {
      setIsTyping(false);
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Focus back on textarea
    textareaRef.current?.focus();
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTyping && isTyping) {
        onTyping(false);
      }
    };
  }, [isTyping, onTyping]);

  /**
   * Auto-resize textarea
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // Max height in pixels
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [message]);

  const charactersRemaining = maxLength - message.length;
  const showCharacterCount = message.length > maxLength * 0.8; // Show when 80% full

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-end gap-2 p-4">
        {/* Attachment button (placeholder for future) */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          className="flex-shrink-0 mb-1"
          title="Attachments (coming soon)"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={clsx(
              'resize-none pr-2 min-h-[44px] max-h-[200px]',
              'scrollbar-thin scrollbar-thumb-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />
          
          {/* Character count */}
          {showCharacterCount && (
            <span
              className={clsx(
                'absolute bottom-2 right-2 text-xs',
                charactersRemaining < 100 ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {charactersRemaining}
            </span>
          )}
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="flex-shrink-0 mb-1"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Help text */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {isTyping && (
          <span className="text-blue-500">Typing...</span>
        )}
      </div>
    </div>
  );
}