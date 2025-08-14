import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateProcessTemplateDto } from '@application/dto/process-template/create-process-template.dto';
import { UpdateProcessTemplateDto } from '@application/dto/process-template/update-process-template.dto';
import { ProcessTemplateResponseDto } from '@application/dto/process-template/process-template-response.dto';
import { CreateProcessTemplateUseCase } from '@application/usecases/process-template/create-process-template.usecase';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@infrastructure/auth/guards/roles.guard';
import { PermissionsGuard } from '@infrastructure/auth/guards/permissions.guard';
import { Roles } from '@infrastructure/auth/decorators/roles.decorator';
import { RequirePermissions } from '@infrastructure/auth/decorators/permissions.decorator';

@ApiTags('Process Templates')
@ApiBearerAuth()
@Controller('process-templates')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ProcessTemplateController {
  constructor(
    private readonly createProcessTemplateUseCase: CreateProcessTemplateUseCase,
    private readonly processTemplateRepository: ProcessTemplateRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new process template' })
  @ApiResponse({ status: 201, type: ProcessTemplateResponseDto })
  @Roles('admin', 'editor')
  @RequirePermissions('templates:create')
  async create(@Body() dto: CreateProcessTemplateDto): Promise<ProcessTemplateResponseDto> {
    return this.createProcessTemplateUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all process templates' })
  @ApiResponse({ status: 200, type: [ProcessTemplateResponseDto] })
  @RequirePermissions('templates:read')
  async findAll(): Promise<ProcessTemplateResponseDto[]> {
    const templates = await this.processTemplateRepository.findAll();
    return templates.map((template) => this.toResponseDto(template));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a process template by ID' })
  @ApiResponse({ status: 200, type: ProcessTemplateResponseDto })
  @RequirePermissions('templates:read')
  async findOne(@Param('id') id: string): Promise<ProcessTemplateResponseDto> {
    const template = await this.processTemplateRepository.findWithStepTemplates(+id);
    if (!template) {
      throw new Error('Process template not found');
    }
    return this.toResponseDto(template);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a process template' })
  @ApiResponse({ status: 200, type: ProcessTemplateResponseDto })
  @Roles('admin', 'editor')
  @RequirePermissions('templates:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessTemplateDto,
  ): Promise<ProcessTemplateResponseDto> {
    const template = await this.processTemplateRepository.findWithStepTemplates(+id);
    if (!template) {
      throw new Error('Process template not found');
    }

    if (dto.name) {
      template.updateName(dto.name);
    }
    if (dto.isActive !== undefined) {
      dto.isActive ? template.activate() : template.deactivate();
    }

    const updated = await this.processTemplateRepository.update(template);
    return this.toResponseDto(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a process template' })
  @ApiResponse({ status: 204 })
  @Roles('admin')
  @RequirePermissions('templates:delete')
  async remove(@Param('id') id: string): Promise<void> {
    await this.processTemplateRepository.delete(+id);
  }

  private toResponseDto(template: any): ProcessTemplateResponseDto {
    return {
      id: template.getId(),
      name: template.getName(),
      version: template.getVersion(),
      isActive: template.getIsActive(),
      createdAt: template.getCreatedAt(),
      updatedAt: template.getUpdatedAt(),
      stepTemplates: template.getStepTemplates().map((step: any) => ({
        id: step.getId(),
        processId: step.getProcessId(),
        seq: step.getSeq(),
        name: step.getName(),
        basis: step.getBasis().toString(),
        offsetDays: step.getOffset().getDays(),
        requiredArtifacts: step.getRequiredArtifacts(),
        dependsOn: step.getDependsOn(),
        createdAt: step.getCreatedAt(),
        updatedAt: step.getUpdatedAt(),
      })),
    };
  }
}