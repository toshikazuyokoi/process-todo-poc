'use client';

import { useMemo, useState } from 'react';
import { AIMessage, MessageRole } from '../types';
import { SuggestionChips } from './suggestion-buttons';
import { User, Bot, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface MessageListProps {
  messages: AIMessage[];
  isLoading?: boolean;
  onSendMessage?: (message: string) => void;
  className?: string;
}

/**
 * Message List Component
 * Displays chat message history with proper formatting
 */
export function MessageList({ 
  messages, 
  isLoading = false,
  onSendMessage,
  className = '' 
}: MessageListProps) {
  // Track which message's suggestions are currently shown
  const [activeSuggestionMessageId, setActiveSuggestionMessageId] = useState<string | null>(null);
  
  /**
   * Format timestamp for display
   */
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Group messages by time proximity
   */
  const groupedMessages = useMemo(() => {
    const groups: Array<{ messages: AIMessage[]; showTimestamp: boolean }> = [];
    let currentGroup: AIMessage[] = [];
    let lastTimestamp: Date | null = null;

    messages.forEach((message) => {
      const messageTime = new Date(message.createdAt);
      
      // Start new group if time difference > 5 minutes
      if (lastTimestamp && messageTime.getTime() - lastTimestamp.getTime() > 5 * 60 * 1000) {
        if (currentGroup.length > 0) {
          groups.push({ messages: currentGroup, showTimestamp: true });
        }
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
      
      lastTimestamp = messageTime;
    });

    if (currentGroup.length > 0) {
      groups.push({ messages: currentGroup, showTimestamp: true });
    }

    return groups;
  }, [messages]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-gray-400 ${className}`}>
        <Bot className="w-12 h-12 mb-4" />
        <p>No messages yet</p>
        <p className="text-sm mt-2">Start the conversation by typing a message</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto px-4 py-4 space-y-4 ${className}`}>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-3">
          {/* Timestamp separator */}
          {group.showTimestamp && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {formatTime(group.messages[0].createdAt.toString())}
                </span>
              </div>
            </div>
          )}

          {/* Messages in group */}
          {group.messages.map((message, messageIndex) => {
            // Only show suggestions for the last AI message in the last group
            const isLastMessage = groupIndex === groupedMessages.length - 1 && 
                                  messageIndex === group.messages.length - 1;
            const showSuggestions = isLastMessage && 
                                    message.role === MessageRole.ASSISTANT &&
                                    message.suggestedQuestions &&
                                    message.suggestedQuestions.length > 0 &&
                                    (!activeSuggestionMessageId || activeSuggestionMessageId === message.id);

            return (
              <MessageItem 
                key={message.id} 
                message={message}
                showSuggestions={showSuggestions}
                onSelectSuggestion={(suggestion) => {
                  setActiveSuggestionMessageId(null);
                  onSendMessage?.(suggestion);
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Individual Message Component
 */
interface MessageItemProps {
  message: AIMessage;
  showSuggestions?: boolean;
  onSelectSuggestion?: (suggestion: string) => void;
}

function MessageItem({ message, showSuggestions, onSelectSuggestion }: MessageItemProps) {
  const isUser = message.role === MessageRole.USER;
  const isAssistant = message.role === MessageRole.ASSISTANT;
  const isSystem = message.role === MessageRole.SYSTEM;

  return (
    <div
      className={clsx(
        'flex gap-3',
        isUser && 'flex-row-reverse',
        isSystem && 'justify-center'
      )}
    >
      {/* Avatar */}
      {!isSystem && (
        <div
          className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            isUser ? 'bg-blue-500' : 'bg-gray-600'
          )}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
      )}

      {/* Message Content */}
      <div
        className={clsx(
          'flex flex-col gap-1 max-w-[70%]',
          isUser && 'items-end',
          isSystem && 'max-w-full'
        )}
      >
        {/* Role label for assistant */}
        {isAssistant && (
          <span className="text-xs text-gray-500 px-1">AI Assistant</span>
        )}

        {/* Message bubble */}
        <div
          className={clsx(
            'px-4 py-2 rounded-2xl',
            isUser && 'bg-blue-500 text-white',
            isAssistant && 'bg-gray-100 text-gray-900',
            isSystem && 'bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Metadata */}
        {message.metadata && (
          <div className="flex items-center gap-2 px-1">
            {message.metadata.model && (
              <span className="text-xs text-gray-400">
                {message.metadata.model}
              </span>
            )}
            {message.metadata.tokenCount && (
              <span className="text-xs text-gray-400">
                {message.metadata.tokenCount} tokens
              </span>
            )}
            {message.metadata.processingTime && (
              <span className="text-xs text-gray-400">
                {(message.metadata.processingTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* Suggestion buttons */}
        {showSuggestions && message.suggestedQuestions && onSelectSuggestion && (
          <SuggestionChips
            suggestions={message.suggestedQuestions}
            onSelect={onSelectSuggestion}
            className="mt-2"
          />
        )}
      </div>
    </div>
  );
}