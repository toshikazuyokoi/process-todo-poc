import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';
import { Comment } from '@domain/entities/comment';

@Injectable()
export class GetCommentUseCase {
  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
  ) {}

  async execute(commentId: number): Promise<Comment> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }
    return comment;
  }
}