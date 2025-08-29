import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
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
import { GenerateTemplateRecommendationsUseCase } from '../../application/usecases/ai-agent/generate-template-recommendations.usecase';
import { FinalizeTemplateCreationUseCase } from '../../application/usecases/ai-agent/finalize-template-creation.usecase';
import { SearchBestPracticesUseCase } from '../../application/usecases/ai-agent/search-best-practices.usecase';
import { SearchComplianceRequirementsUseCase } from '../../application/usecases/ai-agent/search-compliance-requirements.usecase';
import { SearchProcessBenchmarksUseCase } from '../../application/usecases/ai-agent/search-process-benchmarks.usecase';
import { 
  GenerateTemplateDto, 
  GenerateTemplateResponseDto,
  FinalizeTemplateDto,
  FinalizeTemplateResponseDto,
} from '../../application/dto/ai-agent/template-recommendation.dto';
import {
  SearchBestPracticesDto,
  SearchBestPracticesResponseDto,
} from '../../application/dto/ai-agent/best-practices.dto';
import {
  SearchComplianceRequirementsDto,
  SearchComplianceRequirementsResponseDto,
} from '../../application/dto/ai-agent/compliance-requirements.dto';
import {
  SearchProcessBenchmarksDto,
  SearchProcessBenchmarksResponseDto,
} from '../../application/dto/ai-agent/process-benchmarks.dto';

// Knowledge Base Management Use Cases
import { GetIndustryTemplatesUseCase } from '../../application/usecases/knowledge-base/get-industry-templates.usecase';
import { CreateIndustryTemplateUseCase } from '../../application/usecases/knowledge-base/create-industry-template.usecase';
import { UpdateIndustryTemplateUseCase } from '../../application/usecases/knowledge-base/update-industry-template.usecase';
import { DeleteIndustryTemplateUseCase } from '../../application/usecases/knowledge-base/delete-industry-template.usecase';
import { GetProcessTypesUseCase } from '../../application/usecases/knowledge-base/get-process-types.usecase';
import { CreateProcessTypeUseCase } from '../../application/usecases/knowledge-base/create-process-type.usecase';
import { UpdateProcessTypeUseCase } from '../../application/usecases/knowledge-base/update-process-type.usecase';
import { DeleteProcessTypeUseCase } from '../../application/usecases/knowledge-base/delete-process-type.usecase';
import { GetBestPracticesUseCase } from '../../application/usecases/knowledge-base/get-best-practices.usecase';
import { CreateBestPracticeUseCase } from '../../application/usecases/knowledge-base/create-best-practice.usecase';
import { UpdateBestPracticeUseCase } from '../../application/usecases/knowledge-base/update-best-practice.usecase';
import { BulkUpdateBestPracticesUseCase } from '../../application/usecases/knowledge-base/bulk-update-best-practices.usecase';

// Knowledge Base Management DTOs
import {
  GetIndustryTemplatesQueryDto,
  IndustryTemplatesResponseDto,
  CreateIndustryTemplateDto,
  UpdateIndustryTemplateDto,
  IndustryTemplateDto,
} from '../../application/dto/knowledge-base/industry-templates.dto';
import {
  GetProcessTypesQueryDto,
  ProcessTypesResponseDto,
  CreateProcessTypeDto,
  UpdateProcessTypeDto,
  ProcessTypeTemplateDto,
} from '../../application/dto/knowledge-base/process-types.dto';
import {
  GetBestPracticesQueryDto,
  BestPracticesResponseDto,
  CreateBestPracticeDto,
  UpdateBestPracticeDto,
  BulkUpdateBestPracticesDto,
  BestPracticeDto,
  BulkUpdateResultDto,
} from '../../application/dto/knowledge-base/best-practices.dto';

// Guards and Decorators
import { AIRateLimitGuard } from '../guards/ai-rate-limit.guard';
import { AIFeatureFlagGuard, FeatureFlag } from '../../infrastructure/security/ai-feature-flag.guard';
import { AuditLog, AuditAction } from '../../infrastructure/monitoring/ai-audit-log.decorator';

@ApiTags('AI Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AIRateLimitGuard, AIFeatureFlagGuard)
@FeatureFlag('ai_agent')  // AI機能全体のフィーチャーフラグ
@Controller('api/ai-agent')
export class AIAgentController {
  constructor(
    private readonly startInterviewUseCase: StartInterviewSessionUseCase,
    private readonly getInterviewUseCase: GetInterviewSessionUseCase,
    private readonly endInterviewUseCase: EndInterviewSessionUseCase,
    private readonly processMessageUseCase: ProcessUserMessageUseCase,
    private readonly getConversationUseCase: GetConversationHistoryUseCase,
    private readonly collectFeedbackUseCase: CollectUserFeedbackUseCase,
    private readonly generateTemplateUseCase: GenerateTemplateRecommendationsUseCase,
    private readonly finalizeTemplateUseCase: FinalizeTemplateCreationUseCase,
    private readonly searchBestPracticesUseCase: SearchBestPracticesUseCase,
    private readonly searchComplianceUseCase: SearchComplianceRequirementsUseCase,
    private readonly searchBenchmarksUseCase: SearchProcessBenchmarksUseCase,
    // Knowledge Base Management Use Cases
    private readonly getIndustryTemplatesUseCase: GetIndustryTemplatesUseCase,
    private readonly createIndustryTemplateUseCase: CreateIndustryTemplateUseCase,
    private readonly updateIndustryTemplateUseCase: UpdateIndustryTemplateUseCase,
    private readonly deleteIndustryTemplateUseCase: DeleteIndustryTemplateUseCase,
    private readonly getProcessTypesUseCase: GetProcessTypesUseCase,
    private readonly createProcessTypeUseCase: CreateProcessTypeUseCase,
    private readonly updateProcessTypeUseCase: UpdateProcessTypeUseCase,
    private readonly deleteProcessTypeUseCase: DeleteProcessTypeUseCase,
    private readonly getBestPracticesUseCase: GetBestPracticesUseCase,
    private readonly createBestPracticeUseCase: CreateBestPracticeUseCase,
    private readonly updateBestPracticeUseCase: UpdateBestPracticeUseCase,
    private readonly bulkUpdateBestPracticesUseCase: BulkUpdateBestPracticesUseCase,
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
  @AuditLog({
    action: AuditAction.SESSION_CREATE,
    resourceType: 'InterviewSession',
    description: 'AI interview session started',
    includeRequest: true,
    includeResponse: false,
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
  @AuditLog({
    action: AuditAction.ACCESS_GRANTED,
    resourceType: 'InterviewSession',
    description: 'Session details accessed',
    includeRequest: false,
    includeResponse: false,
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
  @AuditLog({
    action: AuditAction.SESSION_DELETE,
    resourceType: 'InterviewSession',
    resourceId: ':sessionId',
    description: 'AI interview session ended',
    includeRequest: false,
    includeResponse: false,
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
  @AuditLog({
    action: AuditAction.AI_GENERATE_RESPONSE,
    resourceType: 'AIResponse',
    resourceId: ':sessionId',
    description: 'AI response generated for user message',
    includeRequest: true,
    includeResponse: false,
    sensitiveFields: ['metadata'],
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
  @AuditLog({
    action: AuditAction.ACCESS_GRANTED,
    resourceType: 'ConversationHistory',
    resourceId: ':sessionId',
    description: 'Conversation history accessed',
    includeRequest: false,
    includeResponse: false,
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

  @Post('sessions/:sessionId/generate-template')
  @ApiOperation({ summary: 'Generate template recommendations for a session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template recommendations generated successfully',
    type: GenerateTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or insufficient conversation data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @HttpCode(HttpStatus.CREATED)
  @FeatureFlag('ai_template_generation')
  @AuditLog({
    action: AuditAction.AI_GENERATE_TEMPLATE,
    resourceType: 'TemplateRecommendation',
    resourceId: ':sessionId',
    description: 'AI template recommendations generated',
    includeRequest: true,
    includeResponse: false,
  })
  async generateTemplate(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: GenerateTemplateDto,
  ): Promise<GenerateTemplateResponseDto> {
    const result = await this.generateTemplateUseCase.execute({
      sessionId,
      userId: req.user.id,
      preferences: dto.preferences,
    });

    return result;
  }

  @Post('sessions/:sessionId/finalize-template')
  @ApiOperation({ summary: 'Finalize and save a template from recommendations' })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template finalized successfully',
    type: FinalizeTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session or template not found',
  })
  @HttpCode(HttpStatus.CREATED)
  @FeatureFlag('ai_template_generation')
  @AuditLog({
    action: AuditAction.TEMPLATE_APPROVE,
    resourceType: 'ProcessTemplate',
    resourceId: ':sessionId',
    description: 'Template finalized and saved',
    includeRequest: true,
    includeResponse: false,
  })
  async finalizeTemplate(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: FinalizeTemplateDto,
  ): Promise<FinalizeTemplateResponseDto> {
    const result = await this.finalizeTemplateUseCase.execute({
      sessionId,
      userId: req.user.id,
      templateId: dto.templateId,
      modifications: dto.modifications,
      notes: dto.notes,
    });

    return result;
  }

  @Post('knowledge/best-practices/search')
  @ApiOperation({ summary: 'Search for best practices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Best practices retrieved successfully',
    type: SearchBestPracticesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  @FeatureFlag('ai_web_research')
  @AuditLog({
    action: AuditAction.AI_WEB_SEARCH,
    resourceType: 'BestPractices',
    description: 'Best practices search performed',
    includeRequest: true,
    includeResponse: false,
  })
  async searchBestPractices(
    @Request() req: any,
    @Body() dto: SearchBestPracticesDto,
  ): Promise<SearchBestPracticesResponseDto> {
    const result = await this.searchBestPracticesUseCase.execute({
      userId: req.user.id,
      query: dto.query,
      filters: dto.filters,
      limit: dto.limit,
    });

    return result;
  }

  @Get('research/compliance')
  @ApiOperation({ summary: 'Search compliance requirements' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance requirements retrieved successfully',
    type: SearchComplianceRequirementsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters or missing required filters',
  })
  @FeatureFlag('ai_web_research')
  @AuditLog({
    action: AuditAction.AI_WEB_SEARCH,
    resourceType: 'ComplianceRequirements',
    description: 'Compliance requirements search performed',
    includeRequest: true,
    includeResponse: false,
  })
  async searchCompliance(
    @Request() req: any,
    @Query() dto: SearchComplianceRequirementsDto,
  ): Promise<SearchComplianceRequirementsResponseDto> {
    const result = await this.searchComplianceUseCase.execute({
      userId: req.user.id,
      query: dto.query,
      filters: dto.filters,
      limit: dto.limit,
    });

    return result;
  }

  @Get('research/benchmarks')
  @ApiOperation({ summary: 'Search process benchmarks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Process benchmarks retrieved successfully',
    type: SearchProcessBenchmarksResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters or missing required filters',
  })
  @FeatureFlag('ai_web_research')
  @AuditLog({
    action: AuditAction.AI_WEB_SEARCH,
    resourceType: 'ProcessBenchmarks',
    description: 'Process benchmarks search performed',
    includeRequest: true,
    includeResponse: false,
  })
  async searchBenchmarks(
    @Request() req: any,
    @Query() dto: SearchProcessBenchmarksDto,
  ): Promise<SearchProcessBenchmarksResponseDto> {
    const result = await this.searchBenchmarksUseCase.execute({
      userId: req.user.id,
      query: dto.query,
      filters: dto.filters,
      limit: dto.limit,
    });

    return result;
  }

  // ==================== Knowledge Base Management Endpoints ====================

  // Industry Templates
  @Get('knowledge/industries')
  @ApiOperation({ summary: 'Get industry templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Industry templates retrieved successfully',
    type: IndustryTemplatesResponseDto,
  })
  async getIndustries(
    @Request() req: any,
    @Query() dto: GetIndustryTemplatesQueryDto,
  ): Promise<IndustryTemplatesResponseDto> {
    return await this.getIndustryTemplatesUseCase.execute(dto);
  }

  @Post('knowledge/industries')
  @ApiOperation({ summary: 'Create a new industry template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Industry template created successfully',
    type: IndustryTemplateDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createIndustryTemplate(
    @Request() req: any,
    @Body() dto: CreateIndustryTemplateDto,
  ): Promise<IndustryTemplateDto> {
    return await this.createIndustryTemplateUseCase.execute(dto);
  }

  @Put('knowledge/industries/:id')
  @ApiOperation({ summary: 'Update an existing industry template' })
  @ApiParam({ name: 'id', description: 'Industry template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Industry template updated successfully',
    type: IndustryTemplateDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Industry template not found',
  })
  async updateIndustryTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateIndustryTemplateDto,
  ): Promise<IndustryTemplateDto> {
    return await this.updateIndustryTemplateUseCase.execute(id, dto);
  }

  @Delete('knowledge/industries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an industry template' })
  @ApiParam({ name: 'id', description: 'Industry template ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Industry template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Industry template not found',
  })
  async deleteIndustryTemplate(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteIndustryTemplateUseCase.execute(id);
  }

  // Process Types
  @Get('knowledge/process-types')
  @ApiOperation({ summary: 'Get process types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Process types retrieved successfully',
    type: ProcessTypesResponseDto,
  })
  async getProcessTypes(
    @Request() req: any,
    @Query() dto: GetProcessTypesQueryDto,
  ): Promise<ProcessTypesResponseDto> {
    return await this.getProcessTypesUseCase.execute(dto);
  }

  @Post('knowledge/process-types')
  @ApiOperation({ summary: 'Create a new process type' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Process type created successfully',
    type: ProcessTypeTemplateDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid process type data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createProcessType(
    @Request() req: any,
    @Body() dto: CreateProcessTypeDto,
  ): Promise<ProcessTypeTemplateDto> {
    return await this.createProcessTypeUseCase.execute(dto);
  }

  @Put('knowledge/process-types/:id')
  @ApiOperation({ summary: 'Update an existing process type' })
  @ApiParam({ name: 'id', description: 'Process type ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Process type updated successfully',
    type: ProcessTypeTemplateDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Process type not found',
  })
  async updateProcessType(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProcessTypeDto,
  ): Promise<ProcessTypeTemplateDto> {
    return await this.updateProcessTypeUseCase.execute(id, dto);
  }

  @Delete('knowledge/process-types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a process type' })
  @ApiParam({ name: 'id', description: 'Process type ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Process type deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Process type not found',
  })
  async deleteProcessType(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteProcessTypeUseCase.execute(id);
  }

  // Best Practices
  @Get('knowledge/best-practices')
  @ApiOperation({ summary: 'Get best practices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Best practices retrieved successfully',
    type: BestPracticesResponseDto,
  })
  async getBestPractices(
    @Request() req: any,
    @Query() dto: GetBestPracticesQueryDto,
  ): Promise<BestPracticesResponseDto> {
    return await this.getBestPracticesUseCase.execute(dto);
  }

  @Post('knowledge/best-practices')
  @ApiOperation({ summary: 'Create a new best practice' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Best practice created successfully',
    type: BestPracticeDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid best practice data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createBestPractice(
    @Request() req: any,
    @Body() dto: CreateBestPracticeDto,
  ): Promise<BestPracticeDto> {
    return await this.createBestPracticeUseCase.execute(dto);
  }

  @Put('knowledge/best-practices/:id')
  @ApiOperation({ summary: 'Update an existing best practice' })
  @ApiParam({ name: 'id', description: 'Best practice ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Best practice updated successfully',
    type: BestPracticeDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Best practice not found',
  })
  async updateBestPractice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBestPracticeDto,
  ): Promise<BestPracticeDto> {
    return await this.updateBestPracticeUseCase.execute(id, dto);
  }

  @Post('knowledge/best-practices/bulk-update')
  @ApiOperation({ summary: 'Bulk update best practices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Best practices updated successfully',
    type: BulkUpdateResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bulk update data',
  })
  async bulkUpdateBestPractices(
    @Request() req: any,
    @Body() dto: BulkUpdateBestPracticesDto,
  ): Promise<BulkUpdateResultDto> {
    return await this.bulkUpdateBestPracticesUseCase.execute(dto);
  }
}