import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SocketAuthGuard } from './socket-auth.guard';

export interface AISessionRoom {
  sessionId: string;
  userId: number;
  sockets: Set<string>;
}

export interface AINotification {
  type: 'message' | 'status' | 'progress' | 'error' | 'template';
  sessionId: string;
  data: any;
  timestamp: Date;
}

@WebSocketGateway({
  namespace: '/ai-agent',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private sessionRooms: Map<string, AISessionRoom> = new Map();
  private userSockets: Map<number, Set<string>> = new Map();
  private socketToUser: Map<string, number> = new Map();

  afterInit(server: Server) {
    this.logger.log('AI Agent WebSocket Gateway initialized');
  }

  @UseGuards(SocketAuthGuard)
  async handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        client.disconnect();
        return;
      }

      this.socketToUser.set(client.id, userId);
      
      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      
      // Send connection confirmation
      client.emit('connected', {
        socketId: client.id,
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Connection error', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketToUser.get(client.id);
      
      if (userId) {
        // Remove from user sockets
        this.userSockets.get(userId)?.delete(client.id);
        
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }

        // Remove from all session rooms
        for (const [sessionId, room] of this.sessionRooms.entries()) {
          if (room.sockets.has(client.id)) {
            room.sockets.delete(client.id);
            client.leave(`session:${sessionId}`);
            
            // Clean up empty rooms
            if (room.sockets.size === 0) {
              this.sessionRooms.delete(sessionId);
            }
          }
        }

        this.socketToUser.delete(client.id);
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error('Disconnection error', error);
    }
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketToUser.get(client.id);
      if (!userId) {
        throw new WsException('Unauthorized');
      }

      const { sessionId } = data;
      const roomName = `session:${sessionId}`;

      // Create or update session room
      if (!this.sessionRooms.has(sessionId)) {
        this.sessionRooms.set(sessionId, {
          sessionId,
          userId,
          sockets: new Set(),
        });
      }

      const room = this.sessionRooms.get(sessionId);
      
      // Verify user owns the session
      if (!room || room.userId !== userId) {
        throw new WsException('Unauthorized session access');
      }

      room.sockets.add(client.id);
      client.join(roomName);

      this.logger.log(`User ${userId} joined session ${sessionId}`);

      // Notify client of successful join
      client.emit('session-joined', {
        sessionId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Join session error', error);
      client.emit('error', {
        message: error.message || 'Failed to join session',
      });
    }
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { sessionId } = data;
      const room = this.sessionRooms.get(sessionId);

      if (room && room.sockets.has(client.id)) {
        room.sockets.delete(client.id);
        client.leave(`session:${sessionId}`);

        if (room.sockets.size === 0) {
          this.sessionRooms.delete(sessionId);
        }

        this.logger.log(`Client ${client.id} left session ${sessionId}`);
      }

      client.emit('session-left', {
        sessionId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Leave session error', error);
    }
  }

  /**
   * Send notification to all clients in a session
   */
  sendToSession(sessionId: string, notification: AINotification) {
    const roomName = `session:${sessionId}`;
    this.server.to(roomName).emit('ai-notification', notification);
    
    this.logger.debug(`Sent notification to session ${sessionId}: ${notification.type}`);
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
      
      this.logger.debug(`Sent ${event} to user ${userId}`);
    }
  }

  /**
   * Broadcast AI conversation update
   */
  broadcastConversationUpdate(sessionId: string, message: any) {
    this.sendToSession(sessionId, {
      type: 'message',
      sessionId,
      data: message,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast session status change
   */
  broadcastStatusChange(sessionId: string, status: string) {
    this.sendToSession(sessionId, {
      type: 'status',
      sessionId,
      data: { status },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast template generation progress
   */
  broadcastProgress(sessionId: string, progress: number, message: string) {
    this.sendToSession(sessionId, {
      type: 'progress',
      sessionId,
      data: { progress, message },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast template generation complete
   */
  broadcastTemplateGenerated(sessionId: string, template: any) {
    this.sendToSession(sessionId, {
      type: 'template',
      sessionId,
      data: template,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast error
   */
  broadcastError(sessionId: string, error: string) {
    this.sendToSession(sessionId, {
      type: 'error',
      sessionId,
      data: { error },
      timestamp: new Date(),
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string) {
    const room = this.sessionRooms.get(sessionId);
    
    return {
      sessionId,
      connected: room ? room.sockets.size : 0,
      active: !!room,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionRooms.keys());
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  private extractUserId(client: Socket): number | null {
    // Extract user ID from socket handshake
    // This would typically come from JWT token in production
    const userId = client.handshake.auth?.userId || 
                   client.handshake.query?.userId;
    
    return userId ? parseInt(userId as string, 10) : null;
  }
}