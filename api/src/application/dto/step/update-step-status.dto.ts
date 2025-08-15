import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StepStatusEnum {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export class UpdateStepStatusDto {
  @IsEnum(StepStatusEnum)
  @ApiProperty({ 
    enum: StepStatusEnum,
    description: 'New status for the step'
  })
  status: StepStatusEnum;

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'User ID performing the update',
    required: false 
  })
  userId?: number;
}