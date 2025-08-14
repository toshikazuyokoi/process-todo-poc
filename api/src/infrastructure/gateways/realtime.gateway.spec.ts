import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    // Mock Server
    mockServer = {
      sockets: {
        sockets: new Map(),
      } as any,
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket
    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {
          token: 'test-token',
        },
      } as any,
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeGateway],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    gateway.server = mockServer as Server;
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.afterInit(mockServer as Server);
      expect(logSpy).toHaveBeenCalledWith('WebSocket Gateway initialized');
    });
  });

  describe('handleConnection', () => {
    it('should accept connection with valid token', async () => {
      await gateway.handleConnection(mockSocket as Socket);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'Connected to realtime server',
        clientId: 'test-socket-id',
      });
    });

    it('should reject connection without token', async () => {
      const socketWithoutAuth = {
        ...mockSocket,
        handshake: { auth: {} },
      } as Socket;
      
      await gateway.handleConnection(socketWithoutAuth);
      expect(socketWithoutAuth.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.handleDisconnect(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith('Client disconnected: test-socket-id');
    });

    it('should remove client from all rooms', () => {
      // Setup: Add client to a room
      const rooms = (gateway as any).rooms;
      rooms.set('case-1', new Set(['test-socket-id']));
      
      gateway.handleDisconnect(mockSocket as Socket);
      
      expect(rooms.has('case-1')).toBe(false);
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room successfully', async () => {
      const payload = { caseId: 1 };
      
      await gateway.handleJoinRoom(mockSocket as Socket, payload);
      
      expect(mockSocket.join).toHaveBeenCalledWith('case-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined-room', {
        roomId: 'case-1',
        caseId: 1,
      });
      
      const rooms = (gateway as any).rooms;
      expect(rooms.get('case-1').has('test-socket-id')).toBe(true);
    });

    it('should notify other clients in room', async () => {
      const payload = { caseId: 1 };
      const toMock = { emit: jest.fn() };
      mockSocket.to = jest.fn().mockReturnValue(toMock);
      
      await gateway.handleJoinRoom(mockSocket as Socket, payload);
      
      expect(mockSocket.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('user-joined', {
        userId: 'test-socket-id',
        caseId: 1,
      });
    });

    it('should handle join error', async () => {
      const payload = { caseId: 1 };
      mockSocket.join = jest.fn().mockRejectedValue(new Error('Join failed'));
      
      await expect(
        gateway.handleJoinRoom(mockSocket as Socket, payload)
      ).rejects.toThrow(WsException);
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room successfully', async () => {
      const payload = { caseId: 1 };
      
      // Setup: Add client to room first
      const rooms = (gateway as any).rooms;
      rooms.set('case-1', new Set(['test-socket-id']));
      
      await gateway.handleLeaveRoom(mockSocket as Socket, payload);
      
      expect(mockSocket.leave).toHaveBeenCalledWith('case-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('left-room', {
        roomId: 'case-1',
        caseId: 1,
      });
      expect(rooms.has('case-1')).toBe(false);
    });

    it('should notify other clients in room', async () => {
      const payload = { caseId: 1 };
      const toMock = { emit: jest.fn() };
      mockSocket.to = jest.fn().mockReturnValue(toMock);
      
      await gateway.handleLeaveRoom(mockSocket as Socket, payload);
      
      expect(mockSocket.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('user-left', {
        userId: 'test-socket-id',
        caseId: 1,
      });
    });
  });

  describe('handleCaseUpdate', () => {
    it('should broadcast case update to room', async () => {
      const payload = {
        caseId: 1,
        data: { status: 'IN_PROGRESS' },
      };
      const toMock = { emit: jest.fn() };
      mockSocket.to = jest.fn().mockReturnValue(toMock);
      
      await gateway.handleCaseUpdate(mockSocket as Socket, payload);
      
      expect(mockSocket.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('case-update', expect.objectContaining({
        caseId: 1,
        data: { status: 'IN_PROGRESS' },
        updatedBy: 'test-socket-id',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('handleStepUpdate', () => {
    it('should broadcast step update to room', async () => {
      const payload = {
        caseId: 1,
        stepId: 10,
        data: { status: 'DONE' },
      };
      const toMock = { emit: jest.fn() };
      mockSocket.to = jest.fn().mockReturnValue(toMock);
      
      await gateway.handleStepUpdate(mockSocket as Socket, payload);
      
      expect(mockSocket.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('step-update', expect.objectContaining({
        caseId: 1,
        stepId: 10,
        data: { status: 'DONE' },
        updatedBy: 'test-socket-id',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('broadcastCaseUpdate', () => {
    it('should broadcast to all clients in room', () => {
      const toMock = { emit: jest.fn() };
      mockServer.to = jest.fn().mockReturnValue(toMock);
      
      gateway.broadcastCaseUpdate(1, { status: 'COMPLETED' });
      
      expect(mockServer.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('case-update', expect.objectContaining({
        caseId: 1,
        data: { status: 'COMPLETED' },
        timestamp: expect.any(String),
      }));
    });
  });

  describe('broadcastStepUpdate', () => {
    it('should broadcast to all clients in room', () => {
      const toMock = { emit: jest.fn() };
      mockServer.to = jest.fn().mockReturnValue(toMock);
      
      gateway.broadcastStepUpdate(1, 10, { status: 'IN_PROGRESS' });
      
      expect(mockServer.to).toHaveBeenCalledWith('case-1');
      expect(toMock.emit).toHaveBeenCalledWith('step-update', expect.objectContaining({
        caseId: 1,
        stepId: 10,
        data: { status: 'IN_PROGRESS' },
        timestamp: expect.any(String),
      }));
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return number of connected clients', () => {
      if (mockServer.sockets) {
        (mockServer.sockets as any).sockets = new Map([
          ['client1', {} as any],
          ['client2', {} as any],
        ]);
      }
      
      const count = gateway.getConnectedClientsCount();
      expect(count).toBe(2);
    });
  });

  describe('getRoomClientsCount', () => {
    it('should return number of clients in specific room', () => {
      const rooms = (gateway as any).rooms;
      rooms.set('case-1', new Set(['client1', 'client2']));
      
      const count = gateway.getRoomClientsCount(1);
      expect(count).toBe(2);
    });

    it('should return 0 for non-existent room', () => {
      const count = gateway.getRoomClientsCount(999);
      expect(count).toBe(0);
    });
  });
});