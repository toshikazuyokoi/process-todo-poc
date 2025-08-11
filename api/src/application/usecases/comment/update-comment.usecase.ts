import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Comment } from '@domain/entities/comment';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@Injectable()
export class UpdateCommentUseCase {
  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    commentId: number,
    userId: number,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    // Find comment
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check user permissions
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const isAdmin = user.isAdmin();
    if (!comment.canBeEditedBy(userId, isAdmin)) {
      throw new ForbiddenException('You do not have permission to edit this comment');
    }

    // Update comment content
    comment.updateContent(dto.content);

    // Save changes
    return await this.commentRepository.update(comment);
  }
}