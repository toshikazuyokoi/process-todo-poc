import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';

export class BulkUpdateStepsDto {
  @ApiProperty({
    description: 'Array of step IDs to update',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  stepIds: number[];

  @ApiPropertyOptional({
    description: 'New status to apply to all steps',
    enum: ['pending', 'in_progress', 'completed', 'blocked'],
  })
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'blocked'])
  status?: string;

  @ApiPropertyOptional({
    description: 'New assignee ID to apply to all steps',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  assigneeId?: number | null;

  @ApiPropertyOptional({
    description: 'Lock or unlock all steps',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}