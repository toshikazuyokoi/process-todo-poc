export type NotificationType = 
  | 'STEP_ASSIGNED'
  | 'STEP_DUE_SOON'
  | 'STEP_OVERDUE'
  | 'STEP_COMPLETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_REPLY'
  | 'CASE_CREATED'
  | 'CASE_UPDATED';

export interface NotificationData {
  caseId?: number;
  stepId?: number;
  commentId?: number;
  userId?: number;
  [key: string]: any;
}

export class Notification {
  private readonly id: number | null;
  private readonly userId: number;
  private readonly type: NotificationType;
  private readonly title: string;
  private readonly message: string;
  private readonly data: NotificationData | null;
  private isRead: boolean;
  private readAt: Date | null;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  constructor(params: {
    id?: number | null;
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData | null;
    isRead?: boolean;
    readAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? null;
    this.userId = params.userId;
    this.type = params.type;
    this.title = params.title;
    this.message = params.message;
    this.data = params.data ?? null;
    this.isRead = params.isRead ?? false;
    this.readAt = params.readAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  getId(): number | null {
    return this.id;
  }

  getUserId(): number {
    return this.userId;
  }

  getType(): NotificationType {
    return this.type;
  }

  getTitle(): string {
    return this.title;
  }

  getMessage(): string {
    return this.message;
  }

  getData(): NotificationData | null {
    return this.data;
  }

  getIsRead(): boolean {
    return this.isRead;
  }

  getReadAt(): Date | null {
    return this.readAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  markAsRead(): void {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
    }
  }

  markAsUnread(): void {
    this.isRead = false;
    this.readAt = null;
  }

  static createStepAssignedNotification(
    userId: number,
    stepName: string,
    caseName: string,
    stepId: number,
    caseId: number
  ): Notification {
    return new Notification({
      userId,
      type: 'STEP_ASSIGNED',
      title: 'ステップが割り当てられました',
      message: `「${caseName}」の「${stepName}」があなたに割り当てられました`,
      data: { stepId, caseId }
    });
  }

  static createStepDueSoonNotification(
    userId: number,
    stepName: string,
    dueDate: Date,
    stepId: number,
    caseId: number
  ): Notification {
    return new Notification({
      userId,
      type: 'STEP_DUE_SOON',
      title: 'ステップの期限が近づいています',
      message: `「${stepName}」の期限まであと少しです（${dueDate.toLocaleDateString('ja-JP')}）`,
      data: { stepId, caseId, dueDate: dueDate.toISOString() }
    });
  }

  static createCommentNotification(
    userId: number,
    stepName: string,
    commenterName: string,
    stepId: number,
    commentId: number
  ): Notification {
    return new Notification({
      userId,
      type: 'COMMENT_ADDED',
      title: 'コメントが追加されました',
      message: `${commenterName}さんが「${stepName}」にコメントしました`,
      data: { stepId, commentId }
    });
  }

  static createCommentReplyNotification(
    userId: number,
    replierName: string,
    stepId: number,
    commentId: number
  ): Notification {
    return new Notification({
      userId,
      type: 'COMMENT_REPLY',
      title: 'コメントに返信がありました',
      message: `${replierName}さんがあなたのコメントに返信しました`,
      data: { stepId, commentId }
    });
  }
}