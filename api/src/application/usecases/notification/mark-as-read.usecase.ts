import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { Notification } from '@domain/entities/notification';

@Injectable()
export class MarkAsReadUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(notificationId: number, userId: number): Promise<Notification> {
    // Find notification
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    // Check if user owns the notification
    if (notification.getUserId() !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    // Mark as read
    notification.markAsRead();
    return await this.notificationRepository.update(notification);
  }

  async executeAll(userId: number): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }
}