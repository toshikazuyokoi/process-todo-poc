'use client';

import { useEffect, useRef } from 'react';
import { useSessionManagement } from '../hooks/use-session-management';
import { useAIChat } from '../hooks/use-ai-chat';
import { useTemplateGeneration } from '../hooks/use-template-generation';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { ProgressIndicator } from './progress-indicator';
import { SessionStatus } from '../types';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, MessageSquare, Power, Wand2 } from 'lucide-react';

interface ChatInterfaceProps {
  sessionId?: string;
  className?: string;
  height?: string;
}

/**
 * AI Chat Interface Component
 * Main container for AI chat functionality
 */
export function ChatInterface({ 
  sessionId, 
  className = '', 
  height = 'h-[600px]' 
}: ChatInterfaceProps) {
  const {
    currentSession,
    sessionStatus,
    isLoading: isSessionLoading,
    endSession,
  } = useSessionManagement();

  const {
    messages,
    isLoadingMessages,
    sendMessage,
    isSending,
    isAITyping,
    aiTypingStage,
    estimatedTime,
    handleUserTyping,
    isConnected,
  } = useAIChat(sessionId);

  const {
    isGenerating,
    stage,
    progress,
    message: progressMessage,
    estimatedTimeRemaining,
    stepsCompleted,
    totalSteps,
    currentStep,
    error,
    preview,
    startGeneration,
    cancelGeneration,
    retryGeneration,
    isStarting,
  } = useTemplateGeneration(sessionId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAITyping]);

  const activeSessionId = sessionId || currentSession?.id;
  const isSessionActive = sessionStatus === SessionStatus.ACTIVE;
  const canSendMessage = isSessionActive && isConnected && !isSending;

  const handleEndSession = () => {
    if (activeSessionId) {
      endSession(activeSessionId);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg ${height} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          {activeSessionId && (
            <span className="text-xs text-gray-500">
              Session: {activeSessionId.slice(0, 8)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Generate Template Button */}
          {activeSessionId && isSessionActive && !isGenerating && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startGeneration({ includeResearch: true })}
              disabled={isStarting}
              className="gap-1"
            >
              <Wand2 className="w-4 h-4" />
              Generate Template
            </Button>
          )}
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {/* End Session Button */}
          {activeSessionId && isSessionActive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEndSession}
              className="text-red-600 hover:text-red-700"
            >
              <Power className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Indicator (fixed at top when generating) */}
      {(isGenerating || error || preview) && (
        <ProgressIndicator
          isGenerating={isGenerating}
          stage={stage}
          progress={progress}
          message={progressMessage}
          estimatedTimeRemaining={estimatedTimeRemaining}
          stepsCompleted={stepsCompleted}
          totalSteps={totalSteps}
          currentStep={currentStep}
          error={error}
          preview={preview}
          onCancel={cancelGeneration}
          onRetry={retryGeneration}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {!activeSessionId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
            <p>No active session</p>
            <p className="text-sm mt-2">Start a session to begin chatting</p>
          </div>
        ) : !isSessionActive ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4 text-yellow-500" />
            <p>Session is {sessionStatus}</p>
            <p className="text-sm mt-2">This session is no longer active</p>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              isLoading={isLoadingMessages}
              onSendMessage={sendMessage}
              className="h-full"
            />
            {isAITyping && (
              <div className="px-4 py-2 border-t bg-gray-50">
                <TypingIndicator
                  stage={aiTypingStage}
                  estimatedTime={estimatedTime}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {activeSessionId && isSessionActive && (
        <div className="border-t">
          <MessageInput
            onSendMessage={sendMessage}
            onTyping={handleUserTyping}
            disabled={!canSendMessage}
            placeholder={
              !isConnected 
                ? 'Waiting for connection...' 
                : isSending 
                ? 'Sending...' 
                : 'Type your message...'
            }
          />
        </div>
      )}
    </div>
  );
}