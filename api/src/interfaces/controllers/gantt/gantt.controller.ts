import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GetGanttDataUseCase } from '@application/usecases/gantt/get-gantt-data.usecase';

@ApiTags('gantt')
@Controller('gantt')
export class GanttController {
  constructor(
    private readonly getGanttDataUseCase: GetGanttDataUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Gantt chart data' })
  @ApiQuery({ name: 'caseId', required: false, type: Number, description: 'Filter by case ID' })
  @ApiResponse({ status: 200, description: 'Gantt chart data' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getGanttData(
    @Query('caseId') caseId?: string,
  ) {
    const caseIdNumber = caseId ? parseInt(caseId, 10) : undefined;
    return await this.getGanttDataUseCase.execute(caseIdNumber);
  }
}