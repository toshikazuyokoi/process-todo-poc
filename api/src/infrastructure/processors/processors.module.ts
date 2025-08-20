import { Module } from '@nestjs/common';
import { AIProcessingProcessor } from './ai-processing.processor';
import { QueueModule } from '../queue/queue.module';
import { AIConfigModule } from '../../config/ai-config.module';

/**
 * Processors Module
 * Registers all job processors for background task processing
 */
@Module({
  imports: [
    QueueModule,
    AIConfigModule,
  ],
  providers: [
    AIProcessingProcessor,
  ],
  exports: [
    AIProcessingProcessor,
  ],
})
export class ProcessorsModule {}