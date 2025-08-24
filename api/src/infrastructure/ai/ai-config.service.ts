import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIConfigService {
  constructor(private readonly configService: ConfigService) {}

  getOpenAIApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY', '');
  }

  getModel(): string {
    return this.configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo');
  }

  getTemperature(): number {
    return this.configService.get<number>('OPENAI_TEMPERATURE', 0.7);
  }

  getMaxTokens(): number {
    return this.configService.get<number>('OPENAI_MAX_TOKENS', 1000);
  }

  getMaxRetries(): number {
    return this.configService.get<number>('OPENAI_MAX_RETRIES', 3);
  }

  getRetryDelay(): number {
    return this.configService.get<number>('OPENAI_RETRY_DELAY', 1000);
  }

  getRateLimitPerMinute(): number {
    return this.configService.get<number>('OPENAI_RATE_LIMIT_PER_MINUTE', 60);
  }

  getRateLimitPerDay(): number {
    return this.configService.get<number>('OPENAI_RATE_LIMIT_PER_DAY', 1000);
  }

  /**
   * Get session rate limit configuration
   */
  getSessionRateLimit(): {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
  } {
    return {
      maxRequestsPerMinute: this.configService.get<number>('SESSION_RATE_LIMIT_PER_MINUTE', 20),
      maxRequestsPerHour: this.configService.get<number>('SESSION_RATE_LIMIT_PER_HOUR', 100),
      maxRequestsPerDay: this.configService.get<number>('SESSION_RATE_LIMIT_PER_DAY', 500),
    };
  }
}