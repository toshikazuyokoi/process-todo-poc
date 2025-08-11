import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({ description: 'Process template ID' })
  @IsNumber()
  @IsNotEmpty()
  processId: number;

  @ApiProperty({ description: 'Case title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Goal date in ISO format' })
  @IsDateString()
  @IsNotEmpty()
  goalDateUtc: string;

  @ApiProperty({ description: 'User ID who creates the case', required: false })
  @IsNumber()
  @IsOptional()
  createdBy?: number;
}