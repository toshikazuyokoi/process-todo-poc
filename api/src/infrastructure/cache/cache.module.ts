import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { AICacheService } from './ai-cache.service';
import { CacheKeyGenerator } from './cache-key.generator';

const { CacheModule } = require('@nestjs/cache-manager');

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 1), // Use DB 1 for AI cache
          ttl: configService.get('AI_CACHE_TTL', 3600),
        }),
      }),
    }),
  ],
  providers: [AICacheService, CacheKeyGenerator],
  exports: [AICacheService, CacheKeyGenerator],
})
export class AICacheModule {}