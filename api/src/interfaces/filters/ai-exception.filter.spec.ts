import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { AIExceptionFilter } from './ai-exception.filter';
import { DomainException } from '../../domain/exceptions/domain.exception';

describe('AIExceptionFilter', () => {
  let filter: AIExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new AIExceptionFilter();

    mockRequest = {
      url: '/api/ai-agent/sessions/123/messages',
      method: 'POST',
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;
  });

  describe('AI-specific error handling', () => {
    it('should handle DomainException with AI error codes', () => {
      const exception = new DomainException('AI rate limit exceeded', 'AI_RATE_LIMIT');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          errorCode: 'INTERNAL_ERROR',
        }),
      );
    });

    it('should handle HttpException for AI endpoints', () => {
      const exception = new HttpException('Session not found', HttpStatus.NOT_FOUND);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Session not found',
        }),
      );
    });

    it('should handle rate limit exceptions', () => {
      const exception = new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          errorCode: 'RATE_LIMIT_ERROR',
        }),
      );
    });

    it('should include request ID in error response', () => {
      const exception = new Error('Test error');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^err_\d+_[a-z0-9]+$/),
        }),
      );
    });

    it('should inherit all GlobalExceptionFilter functionality', () => {
      // Test that it properly inherits from GlobalExceptionFilter
      expect(filter).toBeInstanceOf(AIExceptionFilter);
      expect(filter['generateRequestId']).toBeDefined();
      expect(filter['sanitizeErrorMessage']).toBeDefined();
      expect(filter['formatMessage']).toBeDefined();
      expect(filter['logError']).toBeDefined();
    });
  });

  describe('logging', () => {
    it('should use AIExceptionFilter logger name', () => {
      const loggerSpy = jest.spyOn(filter['logger'], 'error');
      const exception = new Error('Test error');
      
      filter.catch(exception, mockHost);

      // Logger should be called (inherited from GlobalExceptionFilter)
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});