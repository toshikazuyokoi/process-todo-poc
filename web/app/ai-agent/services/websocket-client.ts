import { io, Socket } from 'socket.io-client'
import Cookies from 'js-cookie'

export type WebSocketEventCallback = (...args: any[]) => void

export interface WebSocketEvents {
  connected: () => void;
  disconnected: () => void;
  message: (data: any) => void;
  typing: (data: any) => void;
  progress: (data: any) => void;
  template: (data: any) => void;
  error: (error: any) => void;
  'ai:message:received': (data: any) => void;
  'ai:message:typing': (data: any) => void;
  'ai:template:progress': (data: any) => void;
  'ai:template:completed': (data: any) => void;
  'ai:requirements:extracted': (data: any) => void;
}

class WebSocketClient {
  private socket: Socket | null = null
  private listeners: Map<string, Set<WebSocketEventCallback>> = new Map()
  private sessionId: string | null = null

  /**
   * Connect to WebSocket server
   */
  connect(sessionId: string): void {
    if (this.socket?.connected && this.sessionId === sessionId) {
      console.log('WebSocket already connected to session:', sessionId)
      return
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect()
    }

    const token = Cookies.get('accessToken')
    if (!token) {
      console.error('No access token found')
      this.emit('error', new Error('Authentication required'))
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3005'
    
    console.log('Connecting to WebSocket:', wsUrl, 'Session:', sessionId)

    // Note: The namespace might need adjustment based on backend implementation
    // Currently using root namespace, adjust to '/ai-agent' if backend supports it
    this.socket = io(wsUrl, {
      auth: { token },
      query: { sessionId },
      transports: ['websocket', 'polling'], // Add polling as fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    this.sessionId = sessionId
    this.setupEventHandlers()
  }

  /**
   * Setup event handlers for socket events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected, socket ID:', this.socket?.id)
      this.emit('connected')
      
      // Join session room
      if (this.sessionId) {
        this.socket?.emit('ai:session:join', { sessionId: this.sessionId })
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.emit('disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message)
      this.emit('error', error)
    })

    // AI Agent specific events
    this.socket.on('ai:message:received', (data) => {
      console.log('Message received:', data)
      this.emit('ai:message:received', data)
      this.emit('message', data) // Backward compatibility
    })

    this.socket.on('ai:message:typing', (data) => {
      console.log('Typing indicator:', data)
      this.emit('ai:message:typing', data)
      this.emit('typing', data) // Backward compatibility
    })

    this.socket.on('ai:template:progress', (data) => {
      console.log('Template progress:', data)
      this.emit('ai:template:progress', data)
      this.emit('progress', data) // Backward compatibility
    })

    this.socket.on('ai:template:completed', (data) => {
      console.log('Template completed:', data)
      this.emit('ai:template:completed', data)
      this.emit('template', data) // Backward compatibility
    })

    this.socket.on('ai:requirements:extracted', (data) => {
      console.log('Requirements extracted:', data)
      this.emit('ai:requirements:extracted', data)
    })

    // Generic error handler
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      // Leave session room before disconnecting
      if (this.sessionId) {
        this.socket.emit('ai:session:leave', { sessionId: this.sessionId })
      }
      
      this.socket.disconnect()
      this.socket = null
      this.sessionId = null
    }
    this.listeners.clear()
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Add event listener
   */
  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void
  on(event: string, callback: WebSocketEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void
  off(event: string, callback: WebSocketEventCallback): void {
    this.listeners.get(event)?.delete(callback)
  }

  /**
   * Emit event to local listeners
   */
  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Error in WebSocket event listener for '${event}':`, error)
      }
    })
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(content: string, metadata?: any): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected')
      this.emit('error', new Error('WebSocket not connected'))
      return
    }

    this.socket.emit('ai:message:send', { 
      sessionId: this.sessionId,
      message: content,
      metadata 
    })
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(isTyping: boolean): void {
    if (!this.socket?.connected) return

    this.socket.emit('ai:message:typing:indicator', {
      sessionId: this.sessionId,
      isTyping
    })
  }

  /**
   * Request template generation
   */
  requestTemplateGeneration(options?: any): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected')
      this.emit('error', new Error('WebSocket not connected'))
      return
    }

    this.socket.emit('ai:template:generate', {
      sessionId: this.sessionId,
      options
    })
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient()

// Export class for testing purposes
export { WebSocketClient }