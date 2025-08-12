import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';

export class BulkUpdateCasesDto {
  @ApiProperty({
    description: 'Array of case IDs to update',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  caseIds: number[];

  @ApiPropertyOptional({
    description: 'New status to apply to all cases',
    enum: ['active', 'completed', 'cancelled', 'on_hold'],
  })
  @IsOptional()
  @IsEnum(['active', 'completed', 'cancelled', 'on_hold'])
  status?: string;

  @ApiPropertyOptional({
    description: 'New assignee ID to apply to all case steps',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional({
    description: 'New priority level',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({
    description: 'Tags to add to all cases',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}