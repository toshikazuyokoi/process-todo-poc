import { IsArray, ValidateNested, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StepStatusEnum } from './update-step-status.dto';

export class BulkUpdateStepDto {
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Step ID' })
  stepId: number;

  @IsOptional()
  @IsEnum(StepStatusEnum)
  @ApiProperty({ 
    enum: StepStatusEnum,
    description: 'New status',
    required: false 
  })
  status?: StepStatusEnum;

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'New assignee ID',
    required: false,
    nullable: true
  })
  assigneeId?: number | null;

  @IsOptional()
  @ApiProperty({ 
    description: 'Lock/unlock the step',
    required: false
  })
  locked?: boolean;
}

export class BulkUpdateStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateStepDto)
  @ApiProperty({ 
    type: [BulkUpdateStepDto],
    description: 'Array of step updates to apply'
  })
  updates: BulkUpdateStepDto[];

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'User ID performing the bulk update',
    required: false 
  })
  userId?: number;
}