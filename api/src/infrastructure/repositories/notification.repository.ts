import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { Notification, NotificationType, NotificationData } from '@domain/entities/notification';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Notification): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        userId: notification.getUserId(),
        type: notification.getType(),
        title: notification.getTitle(),
        message: notification.getMessage(),
        data: notification.getData() as any,
        isRead: notification.getIsRead(),
        readAt: notification.getReadAt(),
      },
    });

    return this.toDomainEntity(created);
  }

  async saveMany(notifications: Notification[]): Promise<Notification[]> {
    const data = notifications.map(n => ({
      userId: n.getUserId(),
      type: n.getType(),
      title: n.getTitle(),
      message: n.getMessage(),
      data: n.getData() as any,
      isRead: n.getIsRead(),
      readAt: n.getReadAt(),
    }));

    await this.prisma.notification.createMany({ data });
    
    // Return the notifications with their IDs
    const created = await this.prisma.notification.findMany({
      where: {
        userId: { in: notifications.map(n => n.getUserId()) },
      },
      orderBy: { createdAt: 'desc' },
      take: notifications.length,
    });

    return created.map((n) => this.toDomainEntity(n));
  }

  async findById(id: number): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    return notification ? this.toDomainEntity(notification) : null;
  }

  async findByUserId(userId: number, isRead?: boolean): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => this.toDomainEntity(n));
  }

  async findUnreadCount(userId: number): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async update(notification: Notification): Promise<Notification> {
    const updated = await this.prisma.notification.update({
      where: { id: notification.getId()! },
      data: {
        isRead: notification.getIsRead(),
        readAt: notification.getReadAt(),
      },
    });

    return this.toDomainEntity(updated);
  }

  async updateMany(notifications: Notification[]): Promise<Notification[]> {
    const updates = await Promise.all(
      notifications.map(n =>
        this.prisma.notification.update({
          where: { id: n.getId()! },
          data: {
            isRead: n.getIsRead(),
            readAt: n.getReadAt(),
          },
        })
      )
    );

    return updates.map((u) => this.toDomainEntity(u));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  async markAsRead(id: number): Promise<Notification> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.toDomainEntity(updated);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  private toDomainEntity(prismaNotification: any): Notification {
    return new Notification({
      id: prismaNotification.id,
      userId: prismaNotification.userId,
      type: prismaNotification.type as NotificationType,
      title: prismaNotification.title,
      message: prismaNotification.message,
      data: prismaNotification.data as NotificationData,
      isRead: prismaNotification.isRead,
      readAt: prismaNotification.readAt,
      createdAt: prismaNotification.createdAt,
      updatedAt: prismaNotification.updatedAt,
    });
  }
}