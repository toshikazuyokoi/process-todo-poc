export class Comment {
  private readonly id: number | null;
  private readonly stepId: number;
  private readonly parentId: number | null;
  private readonly userId: number;
  private content: string;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private replies: Comment[] = [];

  constructor(params: {
    id?: number | null;
    stepId: number;
    parentId?: number | null;
    userId: number;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id || null;
    this.stepId = params.stepId;
    this.parentId = params.parentId || null;
    this.userId = params.userId;
    this.content = params.content;
    this.createdAt = params.createdAt || new Date();
    this.updatedAt = params.updatedAt || new Date();
  }

  getId(): number | null {
    return this.id;
  }

  getStepId(): number {
    return this.stepId;
  }

  getParentId(): number | null {
    return this.parentId;
  }

  getUserId(): number {
    return this.userId;
  }

  getContent(): string {
    return this.content;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getReplies(): Comment[] {
    return [...this.replies];
  }

  setReplies(replies: Comment[]): void {
    this.replies = [...replies];
  }

  addReply(reply: Comment): void {
    this.replies.push(reply);
  }

  updateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }
    this.content = content;
    this.updatedAt = new Date();
  }

  isReply(): boolean {
    return this.parentId !== null;
  }

  isEditedBy(userId: number): boolean {
    return this.userId === userId;
  }

  canBeEditedBy(userId: number, isAdmin: boolean = false): boolean {
    return this.isEditedBy(userId) || isAdmin;
  }
}