import { IsDateString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplanRequestDto {
  @ApiProperty({ description: 'New goal date in ISO format' })
  @IsDateString()
  goalDateUtc: string;

  @ApiProperty({ description: 'IDs of steps to lock', type: [Number], required: false })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  lockedStepIds?: number[];
}