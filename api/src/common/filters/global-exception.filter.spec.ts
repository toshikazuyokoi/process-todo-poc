import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    filter = new GlobalExceptionFilter();

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {
        'x-request-id': 'test-request-id',
      },
      ip: '127.0.0.1',
      get: jest.fn((key: string) => {
        if (key === 'user-agent') return 'test-agent';
        if (key === 'set-cookie') return undefined;
        return undefined;
      }) as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          path: '/api/test',
          method: 'GET',
          requestId: 'test-request-id',
        })
      );
    });

    it('should handle validation errors', () => {
      const exception = new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['email must be an email', 'name should not be empty'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'email must be an email, name should not be empty',
          validationErrors: ['email must be an email', 'name should not be empty'],
        })
      );
    });

    it('should handle generic errors', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          errorCode: 'INTERNAL_ERROR',
        })
      );
    });

    it('should sanitize sensitive information', () => {
      const exception = new Error('Database connection failed: password=secret123');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Test error');
      exception.stack = 'Error: Test error\n    at TestFile.js:10:5';

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.stringContaining('TestFile.js:10:5'),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Test error');
      exception.stack = 'Error: Test error\n    at TestFile.js:10:5';

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle missing request ID', () => {
      mockRequest.headers = {};

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^err_\d+_[a-z0-9]+$/),
        })
      );
    });

    it('should handle database errors', () => {
      const exception = {
        name: 'QueryFailedError',
        message: 'duplicate key value violates unique constraint',
      };

      filter.catch(exception as any, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Database constraint violation',
          errorCode: 'DATABASE_ERROR',
        })
      );
    });

    it('should handle rate limit errors', () => {
      const exception = new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests',
          errorCode: 'RATE_LIMIT_ERROR',
        })
      );
    });
  });
});