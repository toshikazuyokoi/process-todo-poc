import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(commentId: number, userId: number): Promise<void> {
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
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // Delete comment (and its replies via cascade)
    await this.commentRepository.delete(commentId);
  }
}