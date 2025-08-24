import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { StartSessionDto } from '../../application/dto/ai-agent/start-session.dto';
import { SendMessageDto } from '../../application/dto/ai-agent/send-message.dto';
import { SessionResponseDto } from '../../application/dto/ai-agent/session-response.dto';
import { MessageResponseDto, ConversationHistoryDto } from '../../application/dto/ai-agent/message-response.dto';
import { StartInterviewSessionUseCase } from '../../application/usecases/ai-agent/start-interview-session.usecase';
import { GetInterviewSessionUseCase } from '../../application/usecases/ai-agent/get-interview-session.usecase';
import { EndInterviewSessionUseCase } from '../../application/usecases/ai-agent/end-interview-session.usecase';
import { ProcessUserMessageUseCase } from '../../application/usecases/ai-agent/process-user-message.usecase';
import { GetConversationHistoryUseCase } from '../../application/usecases/ai-agent/get-conversation-history.usecase';
import { CollectUserFeedbackUseCase } from '../../application/usecases/ai-agent/collect-user-feedback.usecase';
import { SubmitFeedbackDto, FeedbackResponseDto } from '../../application/dto/ai-agent/feedback.dto';

@ApiTags('AI Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai-agent')
export class AIAgentController {
  constructor(
    private readonly startInterviewUseCase: StartInterviewSessionUseCase,
    private readonly getInterviewUseCase: GetInterviewSessionUseCase,
    private readonly endInterviewUseCase: EndInterviewSessionUseCase,
    private readonly processMessageUseCase: ProcessUserMessageUseCase,
    private readonly getConversationUseCase: GetConversationHistoryUseCase,
    private readonly collectFeedbackUseCase: CollectUserFeedbackUseCase,
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new AI interview session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async startSession(
    @Request() req: any,
    @Body() dto: StartSessionDto,
  ): Promise<SessionResponseDto> {
    const result = await this.startInterviewUseCase.execute({
      userId: req.user.id,
      industry: dto.industry,
      processType: dto.processType,
      goal: dto.goal,
      additionalContext: dto.additionalContext,
    });

    return {
      sessionId: result.sessionId,
      status: result.status,
      context: {
        industry: dto.industry,
        processType: dto.processType,
        goal: dto.goal,
        additionalContext: dto.additionalContext,
      },
      conversation: [
        {
          role: 'assistant',
          content: result.welcomeMessage,
          timestamp: result.createdAt,
        },
      ],
      requirements: [],
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
      updatedAt: result.createdAt,
    };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionResponseDto> {
    const result = await this.getInterviewUseCase.execute({
      sessionId,
      userId: req.user.id,
    });

    return result;
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End an AI interview session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session ended successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async endSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.endInterviewUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message to the AI agent' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message processed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async sendMessage(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const result = await this.processMessageUseCase.execute({
      sessionId,
      userId: req.user.id,
      message: dto.message,
      metadata: dto.metadata,
    });

    return {
      sessionId: result.sessionId,
      userMessage: result.userMessage,
      aiResponse: result.aiResponse,
      extractedRequirements: result.extractedRequirements,
      conversationProgress: result.conversationProgress,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
    };
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation history retrieved successfully',
    type: ConversationHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getMessages(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<ConversationHistoryDto> {
    const result = await this.getConversationUseCase.execute({
      sessionId,
      userId: req.user.id,
    });

    return result;
  }

  @Post('knowledge/feedback')
  @ApiOperation({ summary: 'Submit user feedback for AI interaction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feedback submitted successfully',
    type: FeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid feedback data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Request() req: any,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    const result = await this.collectFeedbackUseCase.execute({
      sessionId: dto.sessionId,
      userId: req.user.id,
      type: dto.type,
      category: dto.category,
      rating: dto.rating,
      message: dto.message,
      metadata: dto.metadata,
    });

    return result;
  }
}