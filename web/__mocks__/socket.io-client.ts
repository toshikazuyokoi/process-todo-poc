/**
 * Socket.IO Client Mock for Jest Testing
 * This mock provides a complete implementation of Socket.IO client for testing
 */

import { EventEmitter } from 'events';

export class MockSocket extends EventEmitter {
  public connected: boolean = false;
  public id: string = 'mock-socket-id';
  public disconnected: boolean = true;
  private mockLatency: number = 10;
  private _callbacks: Map<string, Function[]> = new Map();

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  connect() {
    setTimeout(() => {
      this.connected = true;
      this.disconnected = false;
      this.emit('connect');
    }, this.mockLatency);
    return this;
  }

  disconnect() {
    this.connected = false;
    this.disconnected = true;
    this.emit('disconnect', 'io client disconnect');
    return this;
  }

  close() {
    return this.disconnect();
  }

  // Override emit to simulate server responses
  emit(event: string, ...args: any[]) {
    // Handle acknowledgment callbacks for AI events
    if (event.startsWith('ai:')) {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        setTimeout(() => {
          callback({ success: true, data: { sessionId: 'mock-session-123' } });
        }, this.mockLatency);
      }
    }

    // Simulate server responses for specific events
    if (event === 'ai:sendMessage') {
      const [data, callback] = args;
      setTimeout(() => {
        // Emit typing indicator
        super.emit('ai:typing', {
          isTyping: true,
          stage: 'analyzing',
          estimatedTime: 5000,
        });

        // Emit message response
        setTimeout(() => {
          super.emit('ai:message', {
            id: `msg-${Date.now()}`,
            sessionId: data.sessionId,
            type: 'ai',
            content: 'Mock AI response',
            timestamp: new Date().toISOString(),
          });
          
          super.emit('ai:typing', {
            isTyping: false,
          });
        }, 100);

        if (callback) callback({ success: true });
      }, this.mockLatency);
    }

    if (event === 'ai:generateTemplate') {
      const [data, callback] = args;
      setTimeout(() => {
        // Emit generation progress
        super.emit('ai:generationProgress', {
          stage: 'analyzing',
          progress: 25,
          message: 'Analyzing requirements',
        });

        setTimeout(() => {
          super.emit('ai:generationProgress', {
            stage: 'generating',
            progress: 75,
            message: 'Generating template',
          });
        }, 50);

        setTimeout(() => {
          super.emit('ai:templateGenerated', {
            template: {
              id: 'mock-template-1',
              sessionId: data.sessionId,
              name: 'Mock Generated Template',
              description: 'Mock template for testing',
              steps: [
                {
                  id: 'step-1',
                  name: 'Mock Step 1',
                  description: 'First mock step',
                  duration: 5,
                  dependencies: [],
                },
              ],
              metadata: {
                generatedAt: new Date().toISOString(),
                generationTime: 1000,
                confidence: 0.85,
                sources: ['Mock Source'],
                version: 1,
                isActive: true,
              },
            },
          });
        }, 100);

        if (callback) callback({ success: true });
      }, this.mockLatency);
    }

    return super.emit(event, ...args);
  }

  // Override on to track callbacks
  on(event: string, callback: Function) {
    if (!this._callbacks.has(event)) {
      this._callbacks.set(event, []);
    }
    this._callbacks.get(event)!.push(callback);
    return super.on(event, callback as any);
  }

  // Override off
  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this._callbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      return super.off(event, callback as any);
    }
    this._callbacks.delete(event);
    return super.removeAllListeners(event);
  }

  // Additional Socket.IO specific methods
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  volatile = {
    emit: this.emit.bind(this),
  };

  io = {
    opts: {},
    engine: {
      transport: {
        name: 'polling',
      },
    },
  };
}

// Socket manager for multiple namespaces
const sockets = new Map<string, MockSocket>();

// Mock io function
export const io = jest.fn((url: string, options?: any) => {
  const namespace = url || 'default';
  const key = `${namespace}-${JSON.stringify(options || {})}`;
  
  if (!sockets.has(key)) {
    const socket = new MockSocket();
    sockets.set(key, socket);
    
    // Auto-connect unless explicitly disabled
    if (options?.autoConnect !== false) {
      setTimeout(() => socket.connect(), 0);
    }
  }
  
  return sockets.get(key)!;
});

// Manager mock
export const Manager = jest.fn().mockImplementation(() => ({
  open: jest.fn(),
  close: jest.fn(),
  socket: jest.fn(() => new MockSocket()),
}));

// Socket class export
export const Socket = MockSocket;

// Test utilities for managing mock state
export const __resetSockets = () => {
  sockets.forEach(socket => socket.disconnect());
  sockets.clear();
};

export const __getSocket = (url: string, options?: any) => {
  const namespace = url || 'default';
  const key = `${namespace}-${JSON.stringify(options || {})}`;
  return sockets.get(key);
};

export const __getAllSockets = () => Array.from(sockets.values());

// Default export
export default { io, Manager, Socket };