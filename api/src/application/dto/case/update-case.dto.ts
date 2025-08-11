import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CaseStatusDto {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export class UpdateCaseDto {
  @ApiProperty({ description: 'Case title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Goal date in ISO format', required: false })
  @IsDateString()
  @IsOptional()
  goalDateUtc?: string;

  @ApiProperty({ description: 'Case status', enum: CaseStatusDto, required: false })
  @IsEnum(CaseStatusDto)
  @IsOptional()
  status?: CaseStatusDto;
}