import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateNotificationUseCase, CreateNotificationDto } from '@application/usecases/notification/create-notification.usecase';
import { GetUserNotificationsUseCase } from '@application/usecases/notification/get-user-notifications.usecase';
import { MarkAsReadUseCase } from '@application/usecases/notification/mark-as-read.usecase';
import { DeleteNotificationUseCase } from '@application/usecases/notification/delete-notification.usecase';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.createNotificationUseCase.execute(dto);
    return {
      id: notification.getId(),
      userId: notification.getUserId(),
      type: notification.getType(),
      title: notification.getTitle(),
      message: notification.getMessage(),
      data: notification.getData(),
      isRead: notification.getIsRead(),
      readAt: notification.getReadAt(),
      createdAt: notification.getCreatedAt(),
      updatedAt: notification.getUpdatedAt(),
    };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple notifications' })
  @ApiResponse({ status: 201, description: 'Notifications created successfully' })
  @ApiResponse({ status: 404, description: 'One or more users not found' })
  async createNotifications(@Body() dtos: CreateNotificationDto[]) {
    const notifications = await this.createNotificationUseCase.executeBatch(dtos);
    return notifications.map(n => ({
      id: n.getId(),
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
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('isRead') isRead?: string,
  ) {
    const isReadValue = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return await this.getUserNotificationsUseCase.execute(userId, isReadValue);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    const userId = 1; // TODO: Get from auth context
    const notification = await this.markAsReadUseCase.execute(id, userId);
    return {
      id: notification.getId(),
      userId: notification.getUserId(),
      type: notification.getType(),
      title: notification.getTitle(),
      message: notification.getMessage(),
      data: notification.getData(),
      isRead: notification.getIsRead(),
      readAt: notification.getReadAt(),
      createdAt: notification.getCreatedAt(),
      updatedAt: notification.getUpdatedAt(),
    };
  }

  @Put('users/:userId/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  @ApiResponse({ status: 204, description: 'All notifications marked as read' })
  async markAllAsRead(@Param('userId', ParseIntPipe) userId: number) {
    await this.markAsReadUseCase.executeAll(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    const userId = 1; // TODO: Get from auth context
    await this.deleteNotificationUseCase.execute(id, userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all notifications for a user' })
  @ApiResponse({ status: 204, description: 'All notifications deleted' })
  async deleteAllNotifications(@Param('userId', ParseIntPipe) userId: number) {
    await this.deleteNotificationUseCase.executeAll(userId);
  }
}