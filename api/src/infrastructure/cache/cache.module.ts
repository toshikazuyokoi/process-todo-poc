import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { AICacheService } from './ai-cache.service';
import { CacheKeyGenerator } from './cache-key.generator';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 1), // Use DB 1 for AI cache
        ttl: configService.get('AI_CACHE_TTL', 3600),
        max: configService.get('AI_CACHE_MAX_SIZE', 1000),
      }),
    }),
  ],
  providers: [AICacheService, CacheKeyGenerator],
  exports: [AICacheService, CacheKeyGenerator],
})
export class AICacheModule {}