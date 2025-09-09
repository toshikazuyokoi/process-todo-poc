import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JoinRoomPayload {
  caseId: number;
}

interface LeaveRoomPayload {
  caseId: number;
}

interface CaseUpdatePayload {
  caseId: number;
  data: any;
}

interface StepUpdatePayload {
  caseId: number;
  stepId: number;
  data: any;
}

interface CommentPayload {
  caseId: number;
  stepId: number;
  commentId: number;
  data: any;
}

@WebSocketGateway({
  cors: {
    origin: '*', // 開発環境では全てのオリジンを許可
    credentials: true,
  },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('RealtimeGateway');
  private readonly rooms = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract and validate token manually
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected - no auth token`);
        client.disconnect();
        return;
      }

      // Validate token and get user ID
      const userId = await this.validateTokenAndGetUserId(token);
      if (!userId) {
        this.logger.warn(`Client ${client.id} disconnected - invalid token`);
        client.disconnect();
        return;
      }

      // Store user info in client data
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // クライアントに接続成功を通知
      client.emit('connected', { 
        message: 'Connected to realtime server',
        clientId: client.id,
        userId,
      });
    } catch (error) {
      this.logger.error('Connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // クライアントが参加していたすべてのルームから削除
    this.rooms.forEach((clients, roomId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });
  }

  @SubscribeMessage('join-case-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const roomId = `case-${payload.caseId}`;
    
    try {
      // Socket.ioのルーム機能を使用
      await client.join(roomId);
      
      // 内部でもルーム管理
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId)?.add(client.id);
      
      this.logger.log(`Client ${client.id} joined room ${roomId}`);
      
      // 同じルームの他のクライアントに通知
      client.to(roomId).emit('user-joined', {
        userId: client.id,
        caseId: payload.caseId,
      });
      
      // クライアントに参加成功を通知
      client.emit('joined-room', { 
        roomId,
        caseId: payload.caseId 
      });
      
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      throw new WsException('Failed to join room');
    }
  }

  @SubscribeMessage('leave-case-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
  ) {
    const roomId = `case-${payload.caseId}`;
    
    try {
      await client.leave(roomId);
      
      // 内部のルーム管理も更新
      if (this.rooms.has(roomId)) {
        const room = this.rooms.get(roomId);
        if (room) {
          room.delete(client.id);
          if (room.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }
      
      this.logger.log(`Client ${client.id} left room ${roomId}`);
      
      // 同じルームの他のクライアントに通知
      client.to(roomId).emit('user-left', {
        userId: client.id,
        caseId: payload.caseId,
      });
      
      // クライアントに退出成功を通知
      client.emit('left-room', { 
        roomId,
        caseId: payload.caseId 
      });
      
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      throw new WsException('Failed to leave room');
    }
  }

  @SubscribeMessage('case-updated')
  async handleCaseUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CaseUpdatePayload,
  ) {
    const roomId = `case-${payload.caseId}`;
    
    this.logger.log(`Broadcasting case update for case ${payload.caseId}`);
    
    // 同じケースを見ている他のクライアントに更新を通知
    client.to(roomId).emit('case-update', {
      caseId: payload.caseId,
      data: payload.data,
      updatedBy: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('step-updated')
  async handleStepUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StepUpdatePayload,
  ) {
    const roomId = `case-${payload.caseId}`;
    
    this.logger.log(`Broadcasting step update for step ${payload.stepId} in case ${payload.caseId}`);
    
    // 同じケースを見ている他のクライアントに更新を通知
    client.to(roomId).emit('step-update', {
      caseId: payload.caseId,
      stepId: payload.stepId,
      data: payload.data,
      updatedBy: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  // サーバー側から能動的に更新を送信するメソッド
  public broadcastCaseUpdate(caseId: number, data: any) {
    const roomId = `case-${caseId}`;
    this.server.to(roomId).emit('case-update', {
      caseId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastStepUpdate(caseId: number, stepId: number, data: any) {
    const roomId = `case-${caseId}`;
    this.server.to(roomId).emit('step-update', {
      caseId,
      stepId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // コメント追加の通知
  public broadcastCommentAdded(caseId: number, stepId: number, comment: any) {
    const roomId = `case-${caseId}`;
    this.server.to(roomId).emit('comment-added', {
      caseId,
      stepId,
      comment,
      timestamp: new Date().toISOString(),
    });
  }

  // コメント削除の通知
  public broadcastCommentDeleted(caseId: number, stepId: number, commentId: number) {
    const roomId = `case-${caseId}`;
    this.server.to(roomId).emit('comment-deleted', {
      caseId,
      stepId,
      commentId,
      timestamp: new Date().toISOString(),
    });
  }

  // 接続中のクライアント数を取得
  public getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  // 特定のケースルームのクライアント数を取得
  public getRoomClientsCount(caseId: number): number {
    const roomId = `case-${caseId}`;
    return this.rooms.get(roomId)?.size || 0;
  }

  // Event listeners for UseCase events
  @OnEvent('step.status.updated')
  handleStepStatusUpdated(payload: {
    caseId: number;
    stepId: number;
    oldStatus: string;
    newStatus: string;
    updatedBy?: number;
  }) {
    this.logger.log(`Step status updated: ${payload.stepId} from ${payload.oldStatus} to ${payload.newStatus}`);
    const roomId = `case-${payload.caseId}`;
    this.server.to(roomId).emit('step-status-updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('step.assignee.updated')
  handleStepAssigneeUpdated(payload: {
    caseId: number;
    stepId: number;
    oldAssigneeId: number | null;
    newAssigneeId: number | null | undefined;
    updatedBy?: number;
  }) {
    this.logger.log(`Step assignee updated: ${payload.stepId} from ${payload.oldAssigneeId} to ${payload.newAssigneeId}`);
    const roomId = `case-${payload.caseId}`;
    this.server.to(roomId).emit('step-assignee-updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('step.locked')
  handleStepLocked(payload: {
    caseId: number;
    stepId: number;
    lockedBy?: number;
  }) {
    this.logger.log(`Step locked: ${payload.stepId}`);
    const roomId = `case-${payload.caseId}`;
    this.server.to(roomId).emit('step-locked', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('step.unlocked')
  handleStepUnlocked(payload: {
    caseId: number;
    stepId: number;
    unlockedBy?: number;
  }) {
    this.logger.log(`Step unlocked: ${payload.stepId}`);
    const roomId = `case-${payload.caseId}`;
    this.server.to(roomId).emit('step-unlocked', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('step.updated')
  handleStepUpdated(payload: {
    caseId: number;
    stepId: number;
    updatedBy?: number;
    changes: {
      status?: string;
      assigneeId?: number | null;
      locked?: boolean;
    };
  }) {
    this.logger.log(`Step updated: ${payload.stepId}`);
    const roomId = `case-${payload.caseId}`;
    this.server.to(roomId).emit('step-updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('steps.bulk.updated')
  handleStepsBulkUpdated(payload: {
    userId?: number;
    totalCount: number;
    successCount: number;
    failureCount: number;
    results: any[];
  }) {
    this.logger.log(`Bulk steps updated: ${payload.successCount} succeeded, ${payload.failureCount} failed`);
    // Get unique case IDs from results
    const caseIds = new Set<number>();
    for (const result of payload.results) {
      if (result.success && result.data?.caseId) {
        caseIds.add(result.data.caseId);
      }
    }
    // Notify all affected case rooms
    for (const caseId of caseIds) {
      const roomId = `case-${caseId}`;
      this.server.to(roomId).emit('steps-bulk-updated', {
        ...payload,
        caseId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Helper methods for authentication
  private extractToken(client: Socket): string | null {
    // Try multiple sources for token
    let token = null;

    // 1. From auth object in handshake
    if (client.handshake.auth?.token) {
      token = client.handshake.auth.token;
    }
    // 2. From query parameters
    else if (client.handshake.query?.token) {
      token = client.handshake.query.token as string;
    }
    // 3. From headers (Bearer token)
    else if (client.handshake.headers?.authorization) {
      const authHeader = client.handshake.headers.authorization;
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    return token;
  }

  private async validateTokenAndGetUserId(token: string): Promise<number | null> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      // Check token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.logger.warn('Token expired');
        return null;
      }

      // Return user ID from token payload
      return payload.sub || null;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      return null;
    }
  }
}