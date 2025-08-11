import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Comment } from '@domain/entities/comment';

export class CreateCommentDto {
  @IsNumber()
  stepId: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}

@Injectable()
export class CreateCommentUseCase {
  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateCommentDto): Promise<Comment> {
    // Validate step exists
    const step = await this.stepRepository.findById(dto.stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Validate user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // If replying, validate parent comment exists
    if (dto.parentId) {
      const parentComment = await this.commentRepository.findById(dto.parentId);
      if (!parentComment) {
        throw new NotFoundException(`Parent comment with ID ${dto.parentId} not found`);
      }
      
      // Ensure parent comment belongs to the same step
      if (parentComment.getStepId() !== dto.stepId) {
        throw new Error('Parent comment must belong to the same step');
      }
    }

    // Create new comment
    const comment = new Comment({
      stepId: dto.stepId,
      parentId: dto.parentId,
      userId: dto.userId,
      content: dto.content,
    });

    // Save comment
    return await this.commentRepository.save(comment);
  }
}