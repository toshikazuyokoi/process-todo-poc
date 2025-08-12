import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  errorCode?: string;
  details?: any;
  requestId?: string;
  validationErrors?: string[];
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // リクエストIDの取得または生成
    const requestId = request.headers['x-request-id'] as string || 
                     this.generateRequestId();

    let status: number;
    let message: string | string[];
    let error: string | undefined;
    let errorCode: string | undefined;
    let details: any;
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      // HTTPException の処理
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        
        // バリデーションエラーの処理
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
          validationErrors = responseObj.message;
        } else {
          message = responseObj.message || exception.message;
        }
        
        error = responseObj.error;
        details = responseObj.details;
        
        // エラーコードの設定
        if (status === HttpStatus.TOO_MANY_REQUESTS) {
          errorCode = 'RATE_LIMIT_ERROR';
        } else if (status === HttpStatus.UNAUTHORIZED) {
          errorCode = 'AUTH_ERROR';
        }
      } else {
        message = exception.message;
      }
    } else if ((exception as any)?.name === 'QueryFailedError') {
      // データベースエラーの処理
      status = HttpStatus.CONFLICT;
      message = 'Database constraint violation';
      errorCode = 'DATABASE_ERROR';
    } else if (exception instanceof Error) {
      // 一般的なエラーの処理
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_ERROR';
      
      // 開発環境でのみスタックトレースを含める
      if (process.env.NODE_ENV === 'development') {
        details = {
          stack: exception.stack,
          name: exception.name,
          originalMessage: exception.message,
        };
      }
    } else {
      // 未知のエラー
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Unknown Error';
    }

    // エラーレスポンスの構築
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.formatMessage(message),
      requestId,
    };

    if (error) {
      errorResponse.error = error;
    }
    
    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }
    
    if (validationErrors) {
      errorResponse.validationErrors = validationErrors;
    }

    if (details) {
      errorResponse.details = details;
    }
    
    // 開発環境でスタックトレースを含める
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // エラーログの記録
    this.logError(exception, request, requestId, status);

    // クライアントへのレスポンス
    response.status(status).json(errorResponse);
  }

  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeErrorMessage(message: string): string {
    // センシティブな情報を除去
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /api[_-]?key/gi,
      /secret/gi,
      /authorization/gi,
    ];

    // 本番環境でのみサニタイズ
    if (process.env.NODE_ENV === 'production') {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(message)) {
          return 'Internal server error';
        }
      }
    }

    return message;
  }

  private formatMessage(message: string | string[]): string {
    if (Array.isArray(message)) {
      return message.map(msg => this.sanitizeErrorMessage(msg)).join(', ');
    }
    return this.sanitizeErrorMessage(message);
  }

  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    status: number,
  ): void {
    const logContext = {
      requestId,
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      // サーバーエラーは error レベルでログ
      this.logger.error(
        `[${requestId}] Internal Server Error`,
        exception instanceof Error ? exception.stack : exception,
        logContext,
      );
    } else if (status >= 400) {
      // クライアントエラーは warn レベルでログ
      this.logger.warn(
        `[${requestId}] Client Error: ${exception}`,
        logContext,
      );
    } else {
      // その他は debug レベルでログ
      this.logger.debug(
        `[${requestId}] Exception: ${exception}`,
        logContext,
      );
    }
  }
}