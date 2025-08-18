import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SearchCasesUseCase, SearchCasesDto } from '@application/usecases/search/search-cases.usecase';
import { SearchStepsUseCase, SearchStepsDto } from '@application/usecases/search/search-steps.usecase';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(
    private readonly searchCasesUseCase: SearchCasesUseCase,
    private readonly searchStepsUseCase: SearchStepsUseCase,
  ) {}

  @Get('cases')
  @ApiOperation({ summary: 'Search and filter cases' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'status', required: false, type: [String], description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchCases(
    @Query('query') query?: string,
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const dto: SearchCasesDto = {
      query,
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return await this.searchCasesUseCase.execute(dto);
  }

  @Get('steps')
  @ApiOperation({ summary: 'Search and filter steps' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'caseId', required: false, type: Number, description: 'Filter by case' })
  @ApiQuery({ name: 'status', required: false, type: [String], description: 'Filter by status' })
  @ApiQuery({ name: 'assigneeId', required: false, type: Number, description: 'Filter by assignee' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchSteps(
    @Query('query') query?: string,
    @Query('caseId') caseId?: string,
    @Query('status') status?: string | string[],
    @Query('assigneeId') assigneeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const dto: SearchStepsDto = {
      query,
      caseId: caseId ? parseInt(caseId, 10) : undefined,
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return await this.searchStepsUseCase.execute(dto);
  }
}