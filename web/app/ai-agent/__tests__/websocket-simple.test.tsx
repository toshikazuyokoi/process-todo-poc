/**
 * Simple WebSocket Mock Test
 * Verifies that our Socket.IO mock implementation works correctly
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { io, __resetSockets, __getSocket } from 'socket.io-client';

// Mock Socket.IO
jest.mock('socket.io-client');

describe('WebSocket Mock Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSockets();
  });

  it('should create mock socket successfully', () => {
    const socket = io('http://localhost:3005/ai-agent');
    
    expect(io).toHaveBeenCalledWith('http://localhost:3005/ai-agent');
    expect(socket).toBeDefined();
    expect(socket.on).toBeDefined();
    expect(socket.emit).toBeDefined();
    expect(socket.connect).toBeDefined();
  });

  it('should handle connection lifecycle', async () => {
    const socket = io('http://localhost:3005/ai-agent', { autoConnect: false });
    
    expect(socket.connected).toBe(false);
    
    socket.connect();
    
    await waitFor(() => {
      expect(socket.connected).toBe(true);
    });
    
    socket.disconnect();
    
    expect(socket.connected).toBe(false);
  });

  it('should emit and receive events', async () => {
    const socket = io('http://localhost:3005/ai-agent');
    const messageHandler = jest.fn();
    
    socket.on('ai:message', messageHandler);
    
    // Wait for connection
    await waitFor(() => {
      expect(socket.connected).toBe(true);
    });
    
    // Emit a message that will trigger auto-response
    socket.emit('ai:sendMessage', { content: 'Test message' }, (response: any) => {
      expect(response.success).toBe(true);
    });
    
    // Wait for the mock to emit response
    await waitFor(() => {
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai',
          content: 'Mock AI response',
        })
      );
    });
  });

  it('should handle template generation events', async () => {
    const socket = io('http://localhost:3005/ai-agent');
    const progressHandler = jest.fn();
    const templateHandler = jest.fn();
    
    socket.on('ai:generationProgress', progressHandler);
    socket.on('ai:templateGenerated', templateHandler);
    
    await waitFor(() => {
      expect(socket.connected).toBe(true);
    });
    
    socket.emit('ai:generateTemplate', { sessionId: 'test-session' });
    
    // Check progress events
    await waitFor(() => {
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'analyzing',
          progress: 25,
        })
      );
    });
    
    // Check template generated event
    await waitFor(() => {
      expect(templateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            name: 'Mock Generated Template',
          }),
        })
      );
    });
  });

  it('should maintain socket instances per namespace', () => {
    const socket1 = io('http://localhost:3005/ai-agent');
    const socket2 = io('http://localhost:3005/ai-agent');
    const socket3 = io('http://localhost:3005/other');
    
    // Same namespace should return same instance
    expect(socket1).toBe(socket2);
    
    // Different namespace should return different instance
    expect(socket1).not.toBe(socket3);
  });

  it('should handle multiple listeners', async () => {
    const socket = io('http://localhost:3005/ai-agent');
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    socket.on('connect', handler1);
    socket.on('connect', handler2);
    
    await waitFor(() => {
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  it('should support removing listeners', async () => {
    const socket = io('http://localhost:3005/ai-agent');
    const handler = jest.fn();
    
    socket.on('test-event', handler);
    socket.emit('test-event');
    
    expect(handler).toHaveBeenCalledTimes(1);
    
    socket.off('test-event', handler);
    socket.emit('test-event');
    
    // Should still be 1 since we removed the listener
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// Test component that uses Socket.IO directly
function TestSocketComponent() {
  const [connected, setConnected] = React.useState(false);
  const [messages, setMessages] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    const socket = io('http://localhost:3005/ai-agent');
    
    socket.on('connect', () => {
      setConnected(true);
    });
    
    socket.on('ai:message', (msg: any) => {
      setMessages(prev => [...prev, msg.content]);
    });
    
    socket.emit('ai:sendMessage', { content: 'Hello' });
    
    return () => {
      socket.off('connect');
      socket.off('ai:message');
      socket.disconnect();
    };
  }, []);
  
  return (
    <div>
      <div>Connection: {connected ? 'Connected' : 'Disconnected'}</div>
      <div>Messages: {messages.join(', ')}</div>
    </div>
  );
}

describe('WebSocket Mock with React Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSockets();
  });

  it('should work with React components', async () => {
    render(<TestSocketComponent />);
    
    // Check initial state
    expect(screen.getByText(/Connection: Disconnected/)).toBeInTheDocument();
    
    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/Connection: Connected/)).toBeInTheDocument();
    });
    
    // Wait for message
    await waitFor(() => {
      expect(screen.getByText(/Messages: Mock AI response/)).toBeInTheDocument();
    });
  });
});