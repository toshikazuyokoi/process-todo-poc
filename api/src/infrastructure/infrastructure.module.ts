import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProcessTemplateRepository } from './repositories/process-template.repository';
import { CaseRepository } from './repositories/case.repository';
import { StepInstanceRepository } from './repositories/step-instance.repository';
import { HolidayRepository } from './repositories/holiday.repository';
import { UserRepository } from './repositories/user.repository';
import { ArtifactRepository } from './repositories/artifact.repository';
import { CommentRepository } from './repositories/comment.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { BusinessDayService } from '@domain/services/business-day.service';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { IHolidayRepository } from '@domain/repositories/holiday.repository.interface';

const repositories = [
  ProcessTemplateRepository,
  CaseRepository,
  StepInstanceRepository,
  HolidayRepository,
  UserRepository,
  ArtifactRepository,
  CommentRepository,
  NotificationRepository,
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

@Module({
  imports: [PrismaModule],
  providers: [...repositories, ...domainServices],
  exports: [...repositories, BusinessDayService, ReplanDomainService],
})
export class InfrastructureModule {}