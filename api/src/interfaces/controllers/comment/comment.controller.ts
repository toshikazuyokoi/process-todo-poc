import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCommentUseCase, CreateCommentDto } from '@application/usecases/comment/create-comment.usecase';
import { UpdateCommentUseCase, UpdateCommentDto } from '@application/usecases/comment/update-comment.usecase';
import { DeleteCommentUseCase } from '@application/usecases/comment/delete-comment.usecase';
import { GetStepCommentsUseCase } from '@application/usecases/comment/get-step-comments.usecase';
import { GetCommentUseCase } from '@application/usecases/comment/get-comment.usecase';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(
    private readonly createCommentUseCase: CreateCommentUseCase,
    private readonly updateCommentUseCase: UpdateCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly getStepCommentsUseCase: GetStepCommentsUseCase,
    private readonly getCommentUseCase: GetCommentUseCase,
    private readonly realtimeGateway: RealtimeGateway,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 404, description: 'Step or user not found' })
  async createComment(
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: number,
  ) {
    // Override userId from token
    dto.userId = userId;
    const comment = await this.createCommentUseCase.execute(dto);
    const responseData = {
      id: comment.getId(),
      stepId: comment.getStepId(),
      parentId: comment.getParentId(),
      userId: comment.getUserId(),
      content: comment.getContent(),
      createdAt: comment.getCreatedAt(),
      updatedAt: comment.getUpdatedAt(),
    };

    // ステップが属するケースIDを取得してWebSocket通知
    const step = await this.stepInstanceRepository.findById(dto.stepId);
    if (step) {
      this.realtimeGateway.broadcastCommentAdded(
        step.getCaseId(),
        dto.stepId,
        responseData,
      );
    }

    return responseData;
  }

  @Get('steps/:stepId')
  @ApiOperation({ summary: 'Get all comments for a step' })
  @ApiResponse({ status: 200, description: 'List of comments with replies' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async getStepComments(@Param('stepId', ParseIntPipe) stepId: number) {
    return await this.getStepCommentsUseCase.execute(stepId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to edit' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser('id') userId: number,
  ) {
    const comment = await this.updateCommentUseCase.execute(id, userId, dto);
    return {
      id: comment.getId(),
      stepId: comment.getStepId(),
      parentId: comment.getParentId(),
      userId: comment.getUserId(),
      content: comment.getContent(),
      createdAt: comment.getCreatedAt(),
      updatedAt: comment.getUpdatedAt(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to delete' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.deleteCommentUseCase.execute(id, userId);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 404, description: 'Parent comment not found' })
  async replyToComment(
    @Param('id', ParseIntPipe) parentId: number,
    @Body() dto: { content: string },
    @CurrentUser('id') userId: number,
  ) {
    // Get parent comment to find stepId
    const parentComment = await this.getCommentUseCase.execute(parentId);

    const replyDto: CreateCommentDto = {
      stepId: parentComment.getStepId(),
      parentId: parentId,
      userId: userId,
      content: dto.content,
    };

    const comment = await this.createCommentUseCase.execute(replyDto);
    return {
      id: comment.getId(),
      stepId: comment.getStepId(),
      parentId: comment.getParentId(),
      userId: comment.getUserId(),
      content: comment.getContent(),
      createdAt: comment.getCreatedAt(),
      updatedAt: comment.getUpdatedAt(),
    };
  }
}