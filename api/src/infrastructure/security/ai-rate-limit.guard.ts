import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AIRateLimitService } from './ai-rate-limit.service';

export const RATE_LIMIT_KEY = 'rateLimit';
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (context: ExecutionContext) => string;
  skipIf?: (context: ExecutionContext) => boolean;
  errorMessage?: string;
}

/**
 * AI Rate Limit Guard
 * Enforces rate limiting on AI endpoints
 */
@Injectable()
export class AIRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AIRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: AIRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Get rate limit options from decorator
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip if no rate limit is configured
    if (!options) {
      return true;
    }

    // Check skip condition
    if (options.skipIf && options.skipIf(context)) {
      return true;
    }

    // Generate identifier for rate limiting
    const identifier = this.generateIdentifier(context, options);

    // Check rate limit
    const result = await this.rateLimitService.checkLimit({
      identifier,
      maxRequests: options.maxRequests,
      windowMs: options.windowMs,
    });

    // Set response headers
    const response = this.getResponse(context);
    if (response) {
      response.setHeader('X-RateLimit-Limit', options.maxRequests || 100);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed && result.retryAfter) {
        response.setHeader('Retry-After', result.retryAfter);
      }
    }

    // Handle rate limit exceeded
    if (!result.allowed) {
      const errorMessage = options.errorMessage || 
        `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`;

      this.logger.warn(`Rate limit exceeded for ${identifier}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: errorMessage,
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Generate identifier for rate limiting
   */
  private generateIdentifier(
    context: ExecutionContext,
    options: RateLimitOptions,
  ): string {
    // Use custom key generator if provided
    if (options.keyGenerator) {
      return options.keyGenerator(context);
    }

    const request = this.getRequest(context);
    
    if (!request) {
      return 'unknown';
    }

    // Try to get user ID from request
    const userId = request.user?.id || request.user?.userId;
    if (userId) {
      return `user-${userId}`;
    }

    // Try to get session ID
    const sessionId = request.session?.id || request.headers['x-session-id'];
    if (sessionId) {
      return `session-${sessionId}`;
    }

    // Fall back to IP address
    const ip = this.getClientIp(request);
    return `ip-${ip}`;
  }

  /**
   * Get request object from context
   */
  private getRequest(context: ExecutionContext): any {
    const type = context.getType();

    if (type === 'http') {
      return context.switchToHttp().getRequest();
    }

    if (type === 'ws') {
      return context.switchToWs().getClient().handshake;
    }

    if (type === 'rpc') {
      return context.switchToRpc().getContext();
    }

    return null;
  }

  /**
   * Get response object from context
   */
  private getResponse(context: ExecutionContext): any {
    const type = context.getType();

    if (type === 'http') {
      return context.switchToHttp().getResponse();
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}

/**
 * Rate limit decorator
 */
export function RateLimit(options: RateLimitOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor!.value);
      return descriptor;
    } else {
      // Class decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, options, target);
      return target;
    }
  };
}

/**
 * Skip rate limit decorator
 */
export function SkipRateLimit() {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata(SKIP_RATE_LIMIT_KEY, true, descriptor!.value);
      return descriptor;
    } else {
      // Class decorator
      Reflect.defineMetadata(SKIP_RATE_LIMIT_KEY, true, target);
      return target;
    }
  };
}