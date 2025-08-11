import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Notification } from '@domain/entities/notification';

export interface NotificationDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSummaryDto {
  notifications: NotificationDto[];
  unreadCount: number;
  totalCount: number;
}

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: number, isRead?: boolean): Promise<NotificationSummaryDto> {
    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get notifications
    const notifications = await this.notificationRepository.findByUserId(userId, isRead);
    const unreadCount = await this.notificationRepository.findUnreadCount(userId);

    // Map to DTOs
    const notificationDtos: NotificationDto[] = notifications.map(n => ({
      id: n.getId()!,
      userId: n.getUserId(),
      type: n.getType(),
      title: n.getTitle(),
      message: n.getMessage(),
      data: n.getData(),
      isRead: n.getIsRead(),
      readAt: n.getReadAt(),
      createdAt: n.getCreatedAt(),
      updatedAt: n.getUpdatedAt(),
    }));

    return {
      notifications: notificationDtos,
      unreadCount,
      totalCount: notifications.length,
    };
  }
}