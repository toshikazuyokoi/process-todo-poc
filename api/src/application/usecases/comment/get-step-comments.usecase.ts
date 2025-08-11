import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Comment } from '@domain/entities/comment';

export interface CommentWithUserDto {
  id: number;
  stepId: number;
  parentId: number | null;
  userId: number;
  userName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  replies: CommentWithUserDto[];
}

@Injectable()
export class GetStepCommentsUseCase {
  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(stepId: number): Promise<CommentWithUserDto[]> {
    // Validate step exists
    const step = await this.stepRepository.findById(stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Get comments with replies
    const comments = await this.commentRepository.findByStepId(stepId);

    // Get all unique user IDs
    const userIds = this.extractUserIds(comments);
    const users = await Promise.all(
      userIds.map(id => this.userRepository.findById(id))
    );
    const userMap = new Map<number, string>();
    users.forEach(u => {
      if (u && u.getId() !== null) {
        userMap.set(u.getId() as number, u.getName());
      }
    });

    // Map comments to DTOs with user information
    return comments.map(comment => this.toDto(comment, userMap));
  }

  private extractUserIds(comments: Comment[]): number[] {
    const ids = new Set<number>();
    
    const extractFromComment = (comment: Comment) => {
      ids.add(comment.getUserId());
      comment.getReplies().forEach(reply => extractFromComment(reply));
    };
    
    comments.forEach(comment => extractFromComment(comment));
    return Array.from(ids);
  }

  private toDto(comment: Comment, userMap: Map<number, string>): CommentWithUserDto {
    return {
      id: comment.getId()!,
      stepId: comment.getStepId(),
      parentId: comment.getParentId(),
      userId: comment.getUserId(),
      userName: userMap.get(comment.getUserId()) || 'Unknown User',
      content: comment.getContent(),
      createdAt: comment.getCreatedAt(),
      updatedAt: comment.getUpdatedAt(),
      replies: comment.getReplies().map(reply => this.toDto(reply, userMap)),
    };
  }
}