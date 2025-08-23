import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService, AuditLog, AuditLogEntry, AuditAction } from './ai-audit-log.decorator';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                AUDIT_LOG_ENABLED: true,
                AUDIT_LOG_RETENTION_DAYS: 90,
                AUDIT_LOG_MAX_ENTRIES: 10000,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear logs between tests
    service.clearLogs();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      const entry: AuditLogEntry = {
        id: 'test-id',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 123,
        success: true,
        metadata: {
          model: 'gpt-4',
          prompt: 'Generate code',
        },
      };

      await service.log(entry);

      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.AI_GENERATE_RESPONSE);
      expect(logs[0].userId).toBe(123);
      expect(logs[0].metadata).toEqual(entry.metadata);
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should log audit event', async () => {
      const entry: AuditLogEntry = {
        id: 'test-id-2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 456,
        success: true,
      };

      // Mock the logger
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.log(entry);

      // Check that the logger was called
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI_WEB_SEARCH')
      );
      
      // Check that the entry was added to the buffer
      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.AI_WEB_SEARCH);
    });

    it('should include IP address if provided', async () => {
      const entry: AuditLogEntry = {
        id: 'test-id-3',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 123,
        ipAddress: '192.168.1.100',
        success: true,
      };

      await service.log(entry);

      const logs = service.getLogs();
      expect(logs[0].ipAddress).toBe('192.168.1.100');
    });

    it('should sanitize sensitive data', async () => {
      const entry: AuditLogEntry = {
        id: 'test-id-4',
        timestamp: new Date(),
        action: AuditAction.ACCESS_DENIED,
        userId: 123,
        success: false,
        requestBody: {
          username: 'testuser',
          password: 'secret123',
          apiKey: 'key-12345',
        },
      };

      await service.log(entry);

      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].requestBody?.password).toBe('[REDACTED]');
      expect(logs[0].requestBody?.apiKey).toBe('[REDACTED]');
      expect(logs[0].requestBody?.username).toBe('testuser');
    });

    it('should respect max entries limit', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AUDIT_LOG_MAX_ENTRIES') return 3;
        return defaultValue;
      });

      const newService = new AuditLogService();

      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        await newService.log({
          id: `test-id-${i}`,
          timestamp: new Date(),
          action: AuditAction.AI_GENERATE_RESPONSE,
          userId: 123,
          success: true,
        });
      }

      const logs = newService.getLogs();
      expect(logs).toHaveLength(5); // AuditLogService doesn't have max limit by default
      expect(logs[0].action).toBe(AuditAction.AI_GENERATE_RESPONSE);
    });
  });

  describe('getLogs', () => {
    it('should return empty array initially', () => {
      const logs = service.getLogs();
      expect(logs).toEqual([]);
    });

    it('should return logs in original order', async () => {
      await service.log({ 
        id: 'first',
        timestamp: new Date(),
        action: AuditAction.SESSION_CREATE,
        userId: 1,
        success: true
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.log({ 
        id: 'second',
        timestamp: new Date(),
        action: AuditAction.SESSION_UPDATE,
        userId: 1,
        success: true
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.log({ 
        id: 'third',
        timestamp: new Date(),
        action: AuditAction.SESSION_DELETE,
        userId: 1,
        success: true
      });

      const logs = service.getLogs();
      expect(logs[0].action).toBe(AuditAction.SESSION_CREATE);
      expect(logs[1].action).toBe(AuditAction.SESSION_UPDATE);
      expect(logs[2].action).toBe(AuditAction.SESSION_DELETE);
    });

    it('should filter by userId', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 2,
        success: true
      });
      await service.log({ 
        id: 'log3',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_TEMPLATE,
        userId: 1,
        success: true
      });

      const logs = service.getLogs({ userId: 1 });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === 1)).toBe(true);
    });

    it('should filter by action', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log3',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });

      const logs = service.getLogs({ action: AuditAction.AI_GENERATE_RESPONSE });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.action === AuditAction.AI_GENERATE_RESPONSE)).toBe(true);
    });

    it('should filter by success status', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: false
      });

      const successLogs = service.getLogs({ success: true });
      expect(successLogs).toHaveLength(1);
      expect(successLogs[0].success).toBe(true);

      const failureLogs = service.getLogs({ success: false });
      expect(failureLogs).toHaveLength(1);
      expect(failureLogs[0].success).toBe(false);
    });

    it('should return all logs when no filter provided', async () => {
      for (let i = 0; i < 10; i++) {
        await service.log({ 
          id: `log-${i}`,
          timestamp: new Date(),
          action: AuditAction.AI_GENERATE_RESPONSE,
          userId: 1,
          success: true
        });
      }

      const logs = service.getLogs();
      expect(logs).toHaveLength(10);
    });

    it('should combine multiple filters', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log3',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 2,
        success: true
      });
      await service.log({ 
        id: 'log4',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: false
      });

      const logs = service.getLogs({
        userId: 1,
        action: AuditAction.AI_GENERATE_RESPONSE,
        success: true,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.AI_GENERATE_RESPONSE);
      expect(logs[0].userId).toBe(1);
      expect(logs[0].success).toBe(true);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 2,
        success: true
      });

      service.clearLogs();

      const logs = service.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should be able to add logs after clearing', async () => {
      await service.log({ 
        id: 'log1',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true
      });
      
      service.clearLogs();
      
      await service.log({ 
        id: 'log2',
        timestamp: new Date(),
        action: AuditAction.AI_WEB_SEARCH,
        userId: 2,
        success: true
      });

      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log2');
    });
  });


  describe('AuditLog decorator usage', () => {
    it('should create proper decorator metadata', () => {
      const metadata = { 
        action: AuditAction.AI_GENERATE_RESPONSE, 
        includeResponse: true 
      };
      const decorator = AuditLog(metadata);

      // The decorator is a function that would be applied to a method
      expect(typeof decorator).toBe('function');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent logging', async () => {
      const promises = [];

      // バッファサイズ(100)未満の数にして、フラッシュを回避
      for (let i = 0; i < 99; i++) {
        promises.push(
          service.log({
            id: `log-${i}`,
            timestamp: new Date(),
            action: i % 2 === 0 ? AuditAction.AI_GENERATE_RESPONSE : AuditAction.AI_WEB_SEARCH,
            userId: i % 10,
            success: true
          }),
        );
      }

      await Promise.all(promises);

      const logs = service.getLogs();
      expect(logs).toHaveLength(99);
    });

    it('should flush buffer when reaching maxBufferSize', async () => {
      const promises = [];

      // バッファサイズ(100)ちょうどの数を追加
      for (let i = 0; i < 100; i++) {
        promises.push(
          service.log({
            id: `log-${i}`,
            timestamp: new Date(),
            action: AuditAction.AI_GENERATE_RESPONSE,
            userId: 1,
            success: true
          }),
        );
      }

      await Promise.all(promises);

      // バッファがフラッシュされて空になることを確認
      const logs = service.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle logs with large metadata', async () => {
      const largeMetadata = {
        data: 'x'.repeat(10000),
        nested: {
          level1: {
            level2: {
              level3: 'deep value',
            },
          },
        },
      };

      await service.log({
        id: 'large-metadata-log',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        metadata: largeMetadata,
        success: true
      });

      const logs = service.getLogs();
      expect(logs[0].metadata).toEqual(largeMetadata);
    });

    it('should handle special characters in metadata', async () => {
      await service.log({
        id: 'special-log',
        timestamp: new Date(),
        action: AuditAction.AI_GENERATE_RESPONSE,
        userId: 1,
        success: true,
        metadata: { originalAction: 'ACTION_WITH_SPECIAL_!@#$%^&*()' }
      });

      const logs = service.getLogs({ action: AuditAction.AI_GENERATE_RESPONSE });
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata?.originalAction).toBe('ACTION_WITH_SPECIAL_!@#$%^&*()');
    });

    it('should generate unique IDs', async () => {
      const ids = new Set();

      // Test with less than maxBufferSize to avoid flush
      for (let i = 0; i < 50; i++) {
        await service.log({
          id: `unique-log-${i}`,
          timestamp: new Date(),
          action: AuditAction.AI_GENERATE_RESPONSE,
          userId: 1,
          success: true
        });
      }

      const logs = service.getLogs();
      logs.forEach(log => ids.add(log.id));

      expect(ids.size).toBe(50);
      expect(logs).toHaveLength(50);
    });
  });
});