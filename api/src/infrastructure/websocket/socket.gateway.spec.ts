import { Test, TestingModule } from '@nestjs/testing';
import { SocketGateway, AISessionRoom } from './socket.gateway';
import { GetInterviewSessionUseCase } from '../../application/usecases/ai-agent/get-interview-session.usecase';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { MESSAGE_EVENTS, SESSION_EVENTS } from '../../interfaces/events/event-names';
import { WsTypingIndicatorDto, WsRequestSessionStatusDto } from '../../interfaces/dto/websocket';
import { SessionStatus } from '../../domain/ai-agent/enums/session-status.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('SocketGateway', () => {
  let gateway: SocketGateway;
  let mockGetSessionUseCase: jest.Mocked<GetInterviewSessionUseCase>;
  let mockServer: Partial<Server>;

  // Helper function to create a mock socket
  const createMockSocket = (userId?: number, socketId: string = 'socket-123'): Partial<Socket> => ({
    id: socketId,
    data: userId ? { userId } : {},
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      auth: userId ? { userId } : {},
      query: {},
      headers: {},
    } as any,
  });

  // Helper function to setup session room
  const setupSessionRoom = (sessionId: string, userId: number, socketId: string = 'socket-123'): void => {
    const sessionRooms = (gateway as any).sessionRooms as Map<string, AISessionRoom>;
    const socketToUser = (gateway as any).socketToUser as Map<string, number>;
    
    sessionRooms.set(sessionId, {
      sessionId,
      userId,
      sockets: new Set([socketId]),
    });
    
    socketToUser.set(socketId, userId);
  };

  beforeEach(async () => {
    // Create mock GetInterviewSessionUseCase
    mockGetSessionUseCase = {
      execute: jest.fn(),
    } as any;

    // Create mock Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        {
          provide: GetInterviewSessionUseCase,
          useValue: mockGetSessionUseCase,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
    gateway.server = mockServer as Server;

    // Clear internal maps
    (gateway as any).sessionRooms = new Map();
    (gateway as any).socketToUser = new Map();
    (gateway as any).userSockets = new Map();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTypingIndicator', () => {
    const mockTypingData: WsTypingIndicatorDto = {
      sessionId: 'session-123',
      isTyping: true,
      estimatedTime: 5000,
      stage: 'researching',
    };

    describe('正常系', () => {
      it('should broadcast typing indicator to other clients in the session', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        const toMock = { emit: jest.fn() };
        mockSocket.to = jest.fn().mockReturnValue(toMock);
        
        setupSessionRoom(mockTypingData.sessionId, userId);

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(mockSocket.to).toHaveBeenCalledWith(`session:${mockTypingData.sessionId}`);
        expect(toMock.emit).toHaveBeenCalledWith(MESSAGE_EVENTS.TYPING, {
          sessionId: mockTypingData.sessionId,
          isTyping: mockTypingData.isTyping,
          estimatedTime: mockTypingData.estimatedTime,
          stage: mockTypingData.stage,
          timestamp: expect.any(String),
        });
        expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.anything());
      });

      it('should handle typing indicator with minimal data', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        const toMock = { emit: jest.fn() };
        mockSocket.to = jest.fn().mockReturnValue(toMock);
        
        const minimalData: WsTypingIndicatorDto = {
          sessionId: 'session-123',
          isTyping: false,
        };
        
        setupSessionRoom(minimalData.sessionId, userId);

        // Act
        await gateway.handleTypingIndicator(minimalData, mockSocket as Socket);

        // Assert
        expect(toMock.emit).toHaveBeenCalledWith(MESSAGE_EVENTS.TYPING, {
          sessionId: minimalData.sessionId,
          isTyping: false,
          estimatedTime: undefined,
          stage: undefined,
          timestamp: expect.any(String),
        });
      });

      it('should log debug message when typing indicator is sent', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        mockSocket.to = jest.fn().mockReturnValue({ emit: jest.fn() });
        
        setupSessionRoom(mockTypingData.sessionId, userId);
        
        const logSpy = jest.spyOn((gateway as any).logger, 'debug');

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(logSpy).toHaveBeenCalledWith(
          `Typing indicator for session ${mockTypingData.sessionId}: ${mockTypingData.isTyping}`
        );
      });
    });

    describe('異常系', () => {
      it('should throw WsException when user is not authenticated', async () => {
        // Arrange
        const mockSocket = createMockSocket(); // No userId

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Unauthorized',
        });
      });

      it('should throw WsException when session does not exist', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        // Setup socketToUser but not sessionRoom
        (gateway as any).socketToUser.set('socket-123', userId);

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Unauthorized session access',
        });
      });

      it('should throw WsException when user does not own the session', async () => {
        // Arrange
        const userId = 1;
        const differentUserId = 2;
        const mockSocket = createMockSocket(userId);
        
        // Setup session room with different user
        setupSessionRoom(mockTypingData.sessionId, differentUserId);
        (gateway as any).socketToUser.set('socket-123', userId);

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Unauthorized session access',
        });
      });

      it('should log error when exception occurs', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockTypingData.sessionId, userId);
        
        // Force an error by making to() throw
        mockSocket.to = jest.fn().mockImplementation(() => {
          throw new Error('Network error');
        });
        
        const logSpy = jest.spyOn((gateway as any).logger, 'error');

        // Act
        await gateway.handleTypingIndicator(mockTypingData, mockSocket as Socket);

        // Assert
        expect(logSpy).toHaveBeenCalledWith('Typing indicator error', expect.any(Error));
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Network error',
        });
      });
    });
  });

  describe('handleStatusRequest', () => {
    const mockStatusRequest: WsRequestSessionStatusDto = {
      sessionId: 'session-123',
    };

    describe('正常系', () => {
      it('should emit session status when request is successful', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const mockSessionResponse = {
          sessionId: mockStatusRequest.sessionId,
          status: 'active',
          context: {
            industry: 'software',
            processType: 'development',
            goal: 'Build application',
            additionalContext: {},
          },
          conversation: [],
          requirements: [],
          generatedTemplate: null,
          suggestedQuestions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(),
        };
        
        mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockGetSessionUseCase.execute).toHaveBeenCalledWith({
          sessionId: mockStatusRequest.sessionId,
          userId: userId,
        });
        
        expect(mockSocket.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, {
          sessionId: mockStatusRequest.sessionId,
          status: 'active',
          reason: undefined,
          timestamp: expect.any(String),
        });
      });

      it('should log debug message when status is requested', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const mockSessionResponse = {
          sessionId: mockStatusRequest.sessionId,
          status: 'completed',
          context: {
            industry: 'test',
            processType: 'test',
            goal: 'test',
          },
          conversation: [],
          requirements: [],
          generatedTemplate: null,
          suggestedQuestions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(),
        };
        
        mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse);
        
        const logSpy = jest.spyOn((gateway as any).logger, 'debug');

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(logSpy).toHaveBeenCalledWith(
          `Status request for session ${mockStatusRequest.sessionId}: completed`
        );
      });

      it('should handle different session statuses correctly', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const statuses = ['active', 'completed', 'expired', 'cancelled'];
        
        for (const status of statuses) {
          const mockSessionResponse = {
            sessionId: mockStatusRequest.sessionId,
            status,
            context: {
              industry: 'test',
              processType: 'test',
              goal: 'test',
            },
            conversation: [],
            requirements: [],
            generatedTemplate: null,
            suggestedQuestions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: new Date(),
          };
          
          mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse);

          // Act
          await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

          // Assert
          expect(mockSocket.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, {
            sessionId: mockStatusRequest.sessionId,
            status,
            reason: undefined,
            timestamp: expect.any(String),
          });
          
          // Clear for next iteration
          jest.clearAllMocks();
          setupSessionRoom(mockStatusRequest.sessionId, userId);
        }
      });
    });

    describe('異常系', () => {
      it('should throw WsException when user is not authenticated', async () => {
        // Arrange
        const mockSocket = createMockSocket(); // No userId

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          code: 'UNKNOWN_ERROR',
          message: 'Unauthorized',
        });
        expect(mockGetSessionUseCase.execute).not.toHaveBeenCalled();
      });

      it('should handle DomainException with proper error response', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const domainException = new DomainException(
          'Session not found',
          'SESSION_NOT_FOUND',
          { sessionId: mockStatusRequest.sessionId }
        );
        
        mockGetSessionUseCase.execute.mockRejectedValue(domainException);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          details: { sessionId: mockStatusRequest.sessionId },
        });
      });

      it('should handle DomainException without code', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const domainException = new DomainException('Invalid session state');
        
        mockGetSessionUseCase.execute.mockRejectedValue(domainException);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          code: 'SESSION_ERROR',
          message: 'Invalid session state',
          details: undefined,
        });
      });

      it('should handle general errors with UNKNOWN_ERROR code', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const generalError = new Error('Database connection failed');
        
        mockGetSessionUseCase.execute.mockRejectedValue(generalError);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          code: 'UNKNOWN_ERROR',
          message: 'Database connection failed',
        });
      });

      it('should handle errors without message', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const errorWithoutMessage = { toString: () => 'CustomError' };
        
        mockGetSessionUseCase.execute.mockRejectedValue(errorWithoutMessage);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to get session status',
        });
      });

      it('should log error when exception occurs', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const error = new Error('Service unavailable');
        mockGetSessionUseCase.execute.mockRejectedValue(error);
        
        const logSpy = jest.spyOn((gateway as any).logger, 'error');

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(logSpy).toHaveBeenCalledWith('Status request error', error);
      });
    });

    describe('Edge cases', () => {
      it('should handle multiple simultaneous status requests from same user', async () => {
        // Arrange
        const userId = 1;
        const mockSocket1 = createMockSocket(userId, 'socket-1');
        const mockSocket2 = createMockSocket(userId, 'socket-2');
        
        setupSessionRoom(mockStatusRequest.sessionId, userId, 'socket-1');
        (gateway as any).socketToUser.set('socket-2', userId);
        
        const mockSessionResponse = {
          sessionId: mockStatusRequest.sessionId,
          status: 'active',
          context: {
            industry: 'test',
            processType: 'test',
            goal: 'test',
          },
          conversation: [],
          requirements: [],
          generatedTemplate: null,
          suggestedQuestions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(),
        };
        
        mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse);

        // Act
        await Promise.all([
          gateway.handleStatusRequest(mockStatusRequest, mockSocket1 as Socket),
          gateway.handleStatusRequest(mockStatusRequest, mockSocket2 as Socket),
        ]);

        // Assert
        expect(mockGetSessionUseCase.execute).toHaveBeenCalledTimes(2);
        expect(mockSocket1.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, expect.any(Object));
        expect(mockSocket2.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, expect.any(Object));
      });

      it('should handle status request with null session response fields', async () => {
        // Arrange
        const userId = 1;
        const mockSocket = createMockSocket(userId);
        
        setupSessionRoom(mockStatusRequest.sessionId, userId);
        
        const mockSessionResponse = {
          sessionId: mockStatusRequest.sessionId,
          status: 'active',
          context: null,
          conversation: null,
          requirements: null,
          generatedTemplate: null,
          suggestedQuestions: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        };
        
        mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse as any);

        // Act
        await gateway.handleStatusRequest(mockStatusRequest, mockSocket as Socket);

        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, {
          sessionId: mockStatusRequest.sessionId,
          status: 'active',
          reason: undefined,
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle sequential typing indicator and status request', async () => {
      // Arrange
      const userId = 1;
      const sessionId = 'session-123';
      const mockSocket = createMockSocket(userId);
      const toMock = { emit: jest.fn() };
      mockSocket.to = jest.fn().mockReturnValue(toMock);
      
      setupSessionRoom(sessionId, userId);
      
      const typingData: WsTypingIndicatorDto = {
        sessionId,
        isTyping: true,
      };
      
      const statusRequest: WsRequestSessionStatusDto = {
        sessionId,
      };
      
      const mockSessionResponse = {
        sessionId,
        status: 'active',
        context: {
          industry: 'test',
          processType: 'test',
          goal: 'test',
        },
        conversation: [],
        requirements: [],
        generatedTemplate: null,
        suggestedQuestions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };
      
      mockGetSessionUseCase.execute.mockResolvedValue(mockSessionResponse);

      // Act
      await gateway.handleTypingIndicator(typingData, mockSocket as Socket);
      await gateway.handleStatusRequest(statusRequest, mockSocket as Socket);

      // Assert
      expect(toMock.emit).toHaveBeenCalledWith(MESSAGE_EVENTS.TYPING, expect.any(Object));
      expect(mockSocket.emit).toHaveBeenCalledWith(SESSION_EVENTS.STATUS_CHANGED, expect.any(Object));
    });

    it('should maintain session room integrity across multiple operations', async () => {
      // Arrange
      const userId = 1;
      const sessionId = 'session-123';
      const mockSocket = createMockSocket(userId);
      mockSocket.to = jest.fn().mockReturnValue({ emit: jest.fn() });
      
      setupSessionRoom(sessionId, userId);
      
      // Verify initial state
      const sessionRooms = (gateway as any).sessionRooms as Map<string, AISessionRoom>;
      const socketToUser = (gateway as any).socketToUser as Map<string, number>;
      
      expect(sessionRooms.has(sessionId)).toBe(true);
      expect(socketToUser.has('socket-123')).toBe(true);

      // Act - Multiple operations
      const typingData: WsTypingIndicatorDto = {
        sessionId,
        isTyping: true,
      };
      
      await gateway.handleTypingIndicator(typingData, mockSocket as Socket);
      
      // Verify state is maintained
      expect(sessionRooms.has(sessionId)).toBe(true);
      expect(socketToUser.has('socket-123')).toBe(true);
      
      const room = sessionRooms.get(sessionId);
      expect(room?.userId).toBe(userId);
      expect(room?.sockets.has('socket-123')).toBe(true);
    });
  });
});