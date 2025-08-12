import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.extractMessage(exceptionResponse),
      errorCode: this.generateErrorCode(status, request.url),
    };

    this.logger.warn(
      `HTTP Exception: ${JSON.stringify(errorResponse)}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }

  private extractMessage(response: string | object): string | string[] {
    if (typeof response === 'string') {
      return response;
    }
    
    const responseObj = response as any;
    return responseObj.message || 'An error occurred';
  }

  private generateErrorCode(status: number, path: string): string {
    const pathSegment = path.split('/')[1] || 'general';
    return `${pathSegment.toUpperCase()}_${status}`;
  }
}