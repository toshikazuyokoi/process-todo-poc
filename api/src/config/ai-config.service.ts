import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AI Agent Configuration Service
 * Centralizes all AI-related configuration and environment variables
 */
@Injectable()
export class AIConfigService {
  constructor(private readonly configService: ConfigService) {}

  // OpenAI Configuration
  get openAIApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  get openAIModel(): string {
    return this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview';
  }

  get openAITemperature(): number {
    return this.configService.get<number>('OPENAI_TEMPERATURE') || 0.7;
  }

  get openAIMaxTokens(): number {
    return this.configService.get<number>('OPENAI_MAX_TOKENS') || 2000;
  }

  get openAITimeoutMs(): number {
    return this.configService.get<number>('OPENAI_TIMEOUT_MS') || 30000;
  }

  // Rate Limiting Configuration
  get rateLimitRequestsPerMinute(): number {
    return this.configService.get<number>('AI_RATE_LIMIT_REQUESTS_PER_MINUTE') || 20;
  }

  get rateLimitTokensPerMinute(): number {
    return this.configService.get<number>('AI_RATE_LIMIT_TOKENS_PER_MINUTE') || 40000;
  }

  get maxConcurrentSessions(): number {
    return this.configService.get<number>('AI_MAX_CONCURRENT_SESSIONS') || 10;
  }

  // Cache Configuration
  get cacheTTLSeconds(): number {
    return this.configService.get<number>('AI_CACHE_TTL_SECONDS') || 86400;
  }

  get sessionTimeoutMinutes(): number {
    return this.configService.get<number>('AI_SESSION_TIMEOUT_MINUTES') || 60;
  }

  get sessionMaxDurationMinutes(): number {
    return this.configService.get<number>('AI_SESSION_MAX_DURATION_MINUTES') || 180;
  }

  // Web Search Configuration
  get webSearchApiKey(): string {
    return this.configService.get<string>('WEB_SEARCH_API_KEY') || '';
  }

  get webSearchEngineId(): string {
    return this.configService.get<string>('WEB_SEARCH_ENGINE_ID') || '';
  }

  get webSearchMaxResults(): number {
    return this.configService.get<number>('WEB_SEARCH_MAX_RESULTS') || 10;
  }

  get webSearchCacheTTLHours(): number {
    return this.configService.get<number>('WEB_SEARCH_CACHE_TTL_HOURS') || 24;
  }

  // Background Job Configuration
  get bullRedisHost(): string {
    return this.configService.get<string>('BULL_REDIS_HOST') || 'localhost';
  }

  get bullRedisPort(): number {
    return this.configService.get<number>('BULL_REDIS_PORT') || 6379;
  }

  get jobDefaultRetries(): number {
    return this.configService.get<number>('BULL_JOB_DEFAULT_RETRIES') || 3;
  }

  get jobDefaultBackoffDelay(): number {
    return this.configService.get<number>('BULL_JOB_DEFAULT_BACKOFF_DELAY') || 5000;
  }

  get jobRemoveOnComplete(): number {
    return this.configService.get<number>('BULL_JOB_REMOVE_ON_COMPLETE') || 100;
  }

  get jobRemoveOnFail(): number {
    return this.configService.get<number>('BULL_JOB_REMOVE_ON_FAIL') || 50;
  }

  // Monitoring & Logging Configuration
  get enableUsageTracking(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_USAGE_TRACKING') ?? true;
  }

  get logLevel(): string {
    return this.configService.get<string>('AI_LOG_LEVEL') || 'info';
  }

  get enableDebugMode(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_DEBUG_MODE') ?? false;
  }

  // Validation Methods
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.openAIApiKey) {
      errors.push('OPENAI_API_KEY is required');
    }

    if (this.openAITemperature < 0 || this.openAITemperature > 2) {
      errors.push('OPENAI_TEMPERATURE must be between 0 and 2');
    }

    if (this.openAIMaxTokens < 1 || this.openAIMaxTokens > 128000) {
      errors.push('OPENAI_MAX_TOKENS must be between 1 and 128000');
    }

    if (this.rateLimitRequestsPerMinute < 1) {
      errors.push('AI_RATE_LIMIT_REQUESTS_PER_MINUTE must be at least 1');
    }

    if (this.maxConcurrentSessions < 1) {
      errors.push('AI_MAX_CONCURRENT_SESSIONS must be at least 1');
    }

    if (this.sessionTimeoutMinutes < 1) {
      errors.push('AI_SESSION_TIMEOUT_MINUTES must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper Methods
  getRedisConfig() {
    return {
      host: this.bullRedisHost,
      port: this.bullRedisPort,
    };
  }

  getJobOptions() {
    return {
      attempts: this.jobDefaultRetries,
      backoff: {
        type: 'exponential' as const,
        delay: this.jobDefaultBackoffDelay,
      },
      removeOnComplete: this.jobRemoveOnComplete,
      removeOnFail: this.jobRemoveOnFail,
    };
  }

  getOpenAIConfig() {
    return {
      apiKey: this.openAIApiKey,
      model: this.openAIModel,
      temperature: this.openAITemperature,
      maxTokens: this.openAIMaxTokens,
      timeout: this.openAITimeoutMs,
    };
  }

  getRateLimits() {
    return {
      requestsPerMinute: this.rateLimitRequestsPerMinute,
      tokensPerMinute: this.rateLimitTokensPerMinute,
      maxConcurrentSessions: this.maxConcurrentSessions,
    };
  }
}