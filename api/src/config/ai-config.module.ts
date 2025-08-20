import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIConfigService } from './ai-config.service';

/**
 * AI Configuration Module
 * Provides AI configuration service globally across the application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [AIConfigService],
  exports: [AIConfigService],
})
export class AIConfigModule implements OnModuleInit {
  constructor(private readonly aiConfigService: AIConfigService) {}

  onModuleInit() {
    // Validate configuration on startup
    const validation = this.aiConfigService.validateConfiguration();
    
    if (!validation.isValid) {
      console.warn('AI Configuration Validation Warnings:');
      validation.errors.forEach(error => console.warn(`  - ${error}`));
      
      // In production, you might want to throw an error
      // if (process.env.NODE_ENV === 'production') {
      //   throw new Error(`AI Configuration Invalid: ${validation.errors.join(', ')}`);
      // }
    } else {
      console.log('AI Configuration validated successfully');
    }

    // Log configuration summary (excluding sensitive data)
    if (this.aiConfigService.enableDebugMode) {
      console.log('AI Configuration Summary:');
      console.log(`  - Model: ${this.aiConfigService.openAIModel}`);
      console.log(`  - Temperature: ${this.aiConfigService.openAITemperature}`);
      console.log(`  - Max Tokens: ${this.aiConfigService.openAIMaxTokens}`);
      console.log(`  - Rate Limit: ${this.aiConfigService.rateLimitRequestsPerMinute} req/min`);
      console.log(`  - Max Concurrent Sessions: ${this.aiConfigService.maxConcurrentSessions}`);
      console.log(`  - Session Timeout: ${this.aiConfigService.sessionTimeoutMinutes} minutes`);
      console.log(`  - Cache TTL: ${this.aiConfigService.cacheTTLSeconds} seconds`);
      console.log(`  - Usage Tracking: ${this.aiConfigService.enableUsageTracking ? 'Enabled' : 'Disabled'}`);
    }
  }
}