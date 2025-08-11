import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { CreateNotificationUseCase } from '@application/usecases/notification/create-notification.usecase';
import { GetUserNotificationsUseCase } from '@application/usecases/notification/get-user-notifications.usecase';
import { MarkAsReadUseCase } from '@application/usecases/notification/mark-as-read.usecase';
import { DeleteNotificationUseCase } from '@application/usecases/notification/delete-notification.usecase';
import { NotificationRepository } from '@infrastructure/repositories/notification.repository';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [NotificationController],
  providers: [
    CreateNotificationUseCase,
    GetUserNotificationsUseCase,
    MarkAsReadUseCase,
    DeleteNotificationUseCase,
    {
      provide: 'INotificationRepository',
      useClass: NotificationRepository,
    },
  ],
  exports: [
    CreateNotificationUseCase,
    GetUserNotificationsUseCase,
    MarkAsReadUseCase,
    DeleteNotificationUseCase,
  ],
})
export class NotificationModule {}