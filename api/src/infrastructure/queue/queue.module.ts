import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { BullJobQueueService } from './bull-job-queue.service';
import { AIConfigModule } from '../../config/ai-config.module';
import { AIConfigService } from '../../config/ai-config.service';

/**
 * Queue Module
 * Configures Bull Queue for background job processing
 */
@Module({
  imports: [
    AIConfigModule,
    BullModule.registerQueueAsync({
      name: 'ai-jobs',
      useFactory: (configService: ConfigService, aiConfigService: AIConfigService) => ({
        redis: {
          host: aiConfigService.bullRedisHost,
          port: aiConfigService.bullRedisPort,
        },
        defaultJobOptions: {
          attempts: aiConfigService.jobDefaultRetries,
          backoff: {
            type: 'exponential',
            delay: aiConfigService.jobDefaultBackoffDelay,
          },
          removeOnComplete: aiConfigService.jobRemoveOnComplete,
          removeOnFail: aiConfigService.jobRemoveOnFail,
        },
      }),
      inject: [ConfigService, AIConfigService],
    }),
  ],
  providers: [
    BullJobQueueService,
    {
      provide: 'BackgroundJobQueue',
      useClass: BullJobQueueService,
    },
  ],
  exports: [
    BullJobQueueService,
    'BackgroundJobQueue',
    BullModule,
  ],
})
export class QueueModule {}