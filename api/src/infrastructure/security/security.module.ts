import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AIRateLimitService } from './ai-rate-limit.service';
import { AIRateLimitGuard } from './ai-rate-limit.guard';
import { FeatureFlagService, AIFeatureFlagGuard } from './ai-feature-flag.guard';
import { DataEncryptionService } from './data-encryption.service';
import { PrivacyManagerService } from './privacy-manager.service';

/**
 * Security Module
 * Provides security services for AI operations
 */
@Global()
@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    // Redis Provider
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        });
      },
      inject: [ConfigService],
    },
    
    // Services
    AIRateLimitService,
    FeatureFlagService,
    DataEncryptionService,
    PrivacyManagerService,
    
    // Guards
    AIRateLimitGuard,
    AIFeatureFlagGuard,
  ],
  exports: [
    AIRateLimitService,
    FeatureFlagService,
    DataEncryptionService,
    PrivacyManagerService,
    AIRateLimitGuard,
    AIFeatureFlagGuard,
  ],
})
export class SecurityModule {}