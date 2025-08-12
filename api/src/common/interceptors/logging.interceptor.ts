import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // リクエストIDをヘッダーに追加
    request.headers['x-request-id'] = requestId;

    const now = Date.now();

    // リクエストログ
    this.logger.log(
      `[${requestId}] Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`,
    );

    if (process.env.NODE_ENV === 'development' && body) {
      this.logger.debug(`[${requestId}] Request Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length');

          this.logger.log(
            `[${requestId}] Response: ${method} ${url} ${statusCode} - ${Date.now() - now}ms - ${contentLength}`,
          );

          if (process.env.NODE_ENV === 'development' && data) {
            this.logger.debug(
              `[${requestId}] Response Body: ${JSON.stringify(data).substring(0, 500)}`,
            );
          }
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;

          this.logger.error(
            `[${requestId}] Error Response: ${method} ${url} ${statusCode} - ${Date.now() - now}ms - ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}