'use client';

import { useAIWebSocket, useSessionManagement } from '../hooks';
import { SessionContext, ComplexityLevel } from '../types';

/**
 * Test Component for Day 1-2 Implementation
 * This component is for testing purposes only
 */
export function AIAgentTestComponent() {
  const { 
    isConnected, 
    connectionError,
    joinSession,
    leaveSession,
    sendMessage,
  } = useAIWebSocket();

  const {
    currentSession,
    sessionStatus,
    isLoading,
    createSession,
    endSession,
  } = useSessionManagement();

  const handleCreateSession = () => {
    const context: SessionContext = {
      industry: 'Software Development',
      processType: 'Project Management',
      goal: 'Test AI Agent Implementation',
      complexity: ComplexityLevel.MEDIUM,
      teamSize: 5,
    };
    createSession(context);
  };

  const handleSendMessage = () => {
    if (currentSession) {
      sendMessage(currentSession.id, 'Hello AI Agent!');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">AI Agent Test Component</h2>
      
      <div className="space-y-2">
        <p>WebSocket Connected: {isConnected ? '✅' : '❌'}</p>
        {connectionError && (
          <p className="text-red-500">Connection Error: {connectionError}</p>
        )}
        <p>Session ID: {currentSession?.id || 'None'}</p>
        <p>Session Status: {sessionStatus || 'None'}</p>
        <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      </div>

      <div className="space-x-2">
        <button
          onClick={handleCreateSession}
          disabled={isLoading || !!currentSession}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Create Session
        </button>
        
        <button
          onClick={handleSendMessage}
          disabled={!currentSession || !isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Send Test Message
        </button>
        
        <button
          onClick={() => currentSession && endSession(currentSession.id)}
          disabled={!currentSession || isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          End Session
        </button>
      </div>
    </div>
  );
}