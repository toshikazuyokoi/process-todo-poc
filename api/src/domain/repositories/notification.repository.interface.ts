import { Notification } from '../entities/notification';

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  saveMany(notifications: Notification[]): Promise<Notification[]>;
  findById(id: number): Promise<Notification | null>;
  findByUserId(userId: number, isRead?: boolean): Promise<Notification[]>;
  findUnreadCount(userId: number): Promise<number>;
  update(notification: Notification): Promise<Notification>;
  updateMany(notifications: Notification[]): Promise<Notification[]>;
  delete(id: number): Promise<void>;
  deleteByUserId(userId: number): Promise<void>;
  markAsRead(id: number): Promise<Notification>;
  markAllAsRead(userId: number): Promise<void>;
}