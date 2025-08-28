import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './gateways/realtime.module';
import { ProcessTemplateRepository } from './repositories/process-template.repository';
import { CaseRepository } from './repositories/case.repository';
import { StepInstanceRepository } from './repositories/step-instance.repository';
import { HolidayRepository } from './repositories/holiday.repository';
import { UserRepository } from './repositories/user.repository';
import { ArtifactRepository } from './repositories/artifact.repository';
import { CommentRepository } from './repositories/comment.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { PrismaInterviewSessionRepository } from './repositories/prisma-interview-session.repository';
import { PrismaProcessKnowledgeRepository } from './repositories/prisma-process-knowledge.repository';
import { PrismaWebResearchCacheRepository } from './repositories/prisma-web-research-cache.repository';
import { PrismaTemplateGenerationHistoryRepository } from './repositories/prisma-template-generation-history.repository';
import { BusinessDayService } from '@domain/services/business-day.service';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { IHolidayRepository } from '@domain/repositories/holiday.repository.interface';
import { AIConfigService } from './ai/ai-config.service';
import { AIRateLimitService } from './ai/ai-rate-limit.service';
import { OpenAIService } from './ai/openai.service';

const repositories = [
  ProcessTemplateRepository,
  CaseRepository,
  StepInstanceRepository,
  HolidayRepository,
  UserRepository,
  ArtifactRepository,
  CommentRepository,
  NotificationRepository,
  PrismaInterviewSessionRepository,
  PrismaProcessKnowledgeRepository,
  PrismaWebResearchCacheRepository,
  PrismaTemplateGenerationHistoryRepository,
  {
    provide: 'IProcessTemplateRepository',
    useClass: ProcessTemplateRepository,
  },
  {
    provide: 'ICaseRepository',
    useClass: CaseRepository,
  },
  {
    provide: 'IStepInstanceRepository',
    useClass: StepInstanceRepository,
  },
  {
    provide: 'IHolidayRepository',
    useClass: HolidayRepository,
  },
  {
    provide: 'IUserRepository',
    useClass: UserRepository,
  },
  {
    provide: 'IArtifactRepository',
    useClass: ArtifactRepository,
  },
  {
    provide: 'ICommentRepository',
    useClass: CommentRepository,
  },
  {
    provide: 'INotificationRepository',
    useClass: NotificationRepository,
  },
  {
    provide: 'InterviewSessionRepository',
    useClass: PrismaInterviewSessionRepository,
  },
  {
    provide: 'ProcessKnowledgeRepository',
    useClass: PrismaProcessKnowledgeRepository,
  },
  {
    provide: 'WebResearchCacheRepository',
    useClass: PrismaWebResearchCacheRepository,
  },
  {
    provide: 'TemplateGenerationHistoryRepository',
    useClass: PrismaTemplateGenerationHistoryRepository,
  },
];

const domainServices = [
  {
    provide: BusinessDayService,
    useFactory: (holidayRepository: IHolidayRepository) => {
      return new BusinessDayService(holidayRepository);
    },
    inject: ['IHolidayRepository'],
  },
  {
    provide: ReplanDomainService,
    useFactory: (businessDayService: BusinessDayService) => {
      return new ReplanDomainService(businessDayService);
    },
    inject: [BusinessDayService],
  },
];

const aiServices = [
  AIConfigService,
  AIRateLimitService,
  OpenAIService,
];

@Module({
  imports: [PrismaModule, RealtimeModule, ConfigModule],
  providers: [
    ...repositories,
    ...domainServices,
    ...aiServices,
    // Redis Client Provider
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
  ],
  exports: [...repositories, BusinessDayService, ReplanDomainService, RealtimeModule, ...aiServices],
})
export class InfrastructureModule {}