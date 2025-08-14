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
import { Logger } from '@nestjs/common';

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

@WebSocketGateway({
  cors: {
    origin: '*', // 開発環境では全てのオリジンを許可
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('RealtimeGateway');
  private readonly rooms = new Map<string, Set<string>>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // 認証チェック（簡易版 - 本番環境ではJWT等を使用）
    const token = client.handshake.auth?.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} disconnected - no auth token`);
      client.disconnect();
      return;
    }

    // クライアントに接続成功を通知
    client.emit('connected', { 
      message: 'Connected to realtime server',
      clientId: client.id 
    });
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

  // 接続中のクライアント数を取得
  public getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  // 特定のケースルームのクライアント数を取得
  public getRoomClientsCount(caseId: number): number {
    const roomId = `case-${caseId}`;
    return this.rooms.get(roomId)?.size || 0;
  }
}