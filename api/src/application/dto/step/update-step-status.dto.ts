import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StepStatusEnum {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked',
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