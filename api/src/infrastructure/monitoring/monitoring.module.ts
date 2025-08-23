import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AIMonitoringService } from './ai-monitoring.service';
import { AuditLogService } from './ai-audit-log.decorator';
import { MetricsService } from './metrics.service';

/**
 * Monitoring Module
 * Provides monitoring and observability services for AI operations
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [
    AIMonitoringService,
    AuditLogService,
    MetricsService,
  ],
  exports: [
    AIMonitoringService,
    AuditLogService,
    MetricsService,
  ],
})
export class MonitoringModule {}