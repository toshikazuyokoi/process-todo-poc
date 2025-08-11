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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCommentUseCase, CreateCommentDto } from '@application/usecases/comment/create-comment.usecase';
import { UpdateCommentUseCase, UpdateCommentDto } from '@application/usecases/comment/update-comment.usecase';
import { DeleteCommentUseCase } from '@application/usecases/comment/delete-comment.usecase';
import { GetStepCommentsUseCase } from '@application/usecases/comment/get-step-comments.usecase';
import { GetCommentUseCase } from '@application/usecases/comment/get-comment.usecase';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(
    private readonly createCommentUseCase: CreateCommentUseCase,
    private readonly updateCommentUseCase: UpdateCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly getStepCommentsUseCase: GetStepCommentsUseCase,
    private readonly getCommentUseCase: GetCommentUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 404, description: 'Step or user not found' })
  async createComment(@Body() dto: CreateCommentDto) {
    const comment = await this.createCommentUseCase.execute(dto);
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
  ) {
    const userId = 1; // TODO: Get from auth context
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
  async deleteComment(@Param('id', ParseIntPipe) id: number) {
    const userId = 1; // TODO: Get from auth context
    await this.deleteCommentUseCase.execute(id, userId);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 404, description: 'Parent comment not found' })
  async replyToComment(
    @Param('id', ParseIntPipe) parentId: number,
    @Body() dto: { content: string; userId: number },
  ) {
    // Get parent comment to find stepId
    const parentComment = await this.getCommentUseCase.execute(parentId);

    const replyDto: CreateCommentDto = {
      stepId: parentComment.getStepId(),
      parentId: parentId,
      userId: dto.userId,
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