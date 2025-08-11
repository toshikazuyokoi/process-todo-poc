import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject } from 'class-validator';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Notification, NotificationType, NotificationData } from '@domain/entities/notification';

export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsObject()
  data?: NotificationData;
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<Notification> {
    // Validate user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Create notification
    const notification = new Notification({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    });

    // Save notification
    return await this.notificationRepository.save(notification);
  }

  async executeBatch(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    // Validate all users exist
    const userIds = [...new Set(dtos.map(dto => dto.userId))];
    const users = await Promise.all(
      userIds.map(id => this.userRepository.findById(id))
    );
    
    const missingUsers = userIds.filter((id, index) => !users[index]);
    if (missingUsers.length > 0) {
      throw new NotFoundException(`Users with IDs ${missingUsers.join(', ')} not found`);
    }

    // Create notifications
    const notifications = dtos.map(dto => new Notification({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    }));

    // Save notifications
    return await this.notificationRepository.saveMany(notifications);
  }
}