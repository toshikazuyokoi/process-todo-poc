import { Controller, Get, Put, Post, Patch, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetStepByIdUseCase } from '@application/usecases/step/get-step-by-id.usecase';
import { UpdateStepStatusUseCase } from '@application/usecases/step/update-step-status.usecase';
import { AssignStepToUserUseCase } from '@application/usecases/step/assign-step-to-user.usecase';
import { LockStepUseCase } from '@application/usecases/step/lock-step.usecase';
import { UnlockStepUseCase } from '@application/usecases/step/unlock-step.usecase';
import { BulkUpdateStepsUseCase } from '@application/usecases/step/bulk-update-steps.usecase';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { UpdateStepStatusDto } from '@application/dto/step/update-step-status.dto';
import { AssignStepDto } from '@application/dto/step/assign-step.dto';
import { BulkUpdateStepsDto } from '@application/dto/step/bulk-update-steps.dto';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';

@ApiTags('Steps')
@ApiBearerAuth()
@Controller('steps')
@UseGuards(JwtAuthGuard)
export class StepController {
  constructor(
    private readonly getStepByIdUseCase: GetStepByIdUseCase,
    private readonly updateStepStatusUseCase: UpdateStepStatusUseCase,
    private readonly assignStepToUserUseCase: AssignStepToUserUseCase,
    private readonly lockStepUseCase: LockStepUseCase,
    private readonly unlockStepUseCase: UnlockStepUseCase,
    private readonly bulkUpdateStepsUseCase: BulkUpdateStepsUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get step by ID' })
  @ApiResponse({ status: 200, description: 'Step found', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StepResponseDto> {
    return this.getStepByIdUseCase.execute({ stepId: id });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update step status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: StepResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepStatusDto,
  ): Promise<StepResponseDto> {
    return this.updateStepStatusUseCase.execute(id, dto);
  }

  @Put(':id/assignee')
  @ApiOperation({ summary: 'Assign or unassign user to step' })
  @ApiResponse({ status: 200, description: 'Assignee updated', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step or user not found' })
  async assignTo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStepDto,
  ): Promise<StepResponseDto> {
    return this.assignStepToUserUseCase.execute(id, dto);
  }

  @Put(':id/lock')
  @ApiOperation({ summary: 'Lock step' })
  @ApiResponse({ status: 200, description: 'Step locked', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step not found' })
  @ApiResponse({ status: 409, description: 'Step already locked' })
  async lock(@Param('id', ParseIntPipe) id: number): Promise<StepResponseDto> {
    return this.lockStepUseCase.execute({ stepId: id });
  }

  @Put(':id/unlock')
  @ApiOperation({ summary: 'Unlock step' })
  @ApiResponse({ status: 200, description: 'Step unlocked', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step not found' })
  @ApiResponse({ status: 409, description: 'Step already unlocked' })
  async unlock(@Param('id', ParseIntPipe) id: number): Promise<StepResponseDto> {
    return this.unlockStepUseCase.execute({ stepId: id });
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update steps' })
  @ApiResponse({ status: 200, description: 'Steps updated', type: [StepResponseDto] })
  @ApiResponse({ status: 207, description: 'Partial success' })
  async bulkUpdate(@Body() dto: BulkUpdateStepsDto): Promise<StepResponseDto[]> {
    return this.bulkUpdateStepsUseCase.execute(dto);
  }
}