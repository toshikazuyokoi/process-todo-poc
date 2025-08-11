import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';

@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(notificationId: number, userId: number): Promise<void> {
    // Find notification
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    // Check if user owns the notification
    if (notification.getUserId() !== userId) {
      throw new ForbiddenException('You can only delete your own notifications');
    }

    // Delete notification
    await this.notificationRepository.delete(notificationId);
  }

  async executeAll(userId: number): Promise<void> {
    await this.notificationRepository.deleteByUserId(userId);
  }
}