import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CreateCommentUseCase } from '@application/usecases/comment/create-comment.usecase';
import { UpdateCommentUseCase } from '@application/usecases/comment/update-comment.usecase';
import { DeleteCommentUseCase } from '@application/usecases/comment/delete-comment.usecase';
import { GetStepCommentsUseCase } from '@application/usecases/comment/get-step-comments.usecase';
import { GetCommentUseCase } from '@application/usecases/comment/get-comment.usecase';
import { CommentRepository } from '@infrastructure/repositories/comment.repository';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [CommentController],
  providers: [
    CreateCommentUseCase,
    UpdateCommentUseCase,
    DeleteCommentUseCase,
    GetStepCommentsUseCase,
    GetCommentUseCase,
    {
      provide: 'ICommentRepository',
      useClass: CommentRepository,
    },
  ],
  exports: [
    CreateCommentUseCase,
    UpdateCommentUseCase,
    DeleteCommentUseCase,
    GetStepCommentsUseCase,
    GetCommentUseCase,
  ],
})
export class CommentModule {}