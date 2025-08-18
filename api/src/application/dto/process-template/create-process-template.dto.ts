import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsInt, Min, Max, IsIn, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStepTemplateDto {
  @ApiProperty({ description: 'Step sequence number' })
  @IsInt()
  @Min(1)
  seq: number;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Basis for calculation', enum: ['goal', 'prev'] })
  @IsString()
  @IsIn(['goal', 'prev'])
  basis: 'goal' | 'prev';

  @ApiProperty({ description: 'Offset days from basis' })
  @IsInt()
  @Min(-365)
  @Max(365)
  offsetDays: number;

  @ApiProperty({ description: 'Required artifacts', type: 'array', required: false })
  @IsArray()
  @IsOptional()
  requiredArtifacts?: Array<{ kind: string; description?: string }>;

  @ApiProperty({ description: 'Dependencies on other steps', type: [Number], required: false })
  @IsArray()
  @IsOptional()
  dependsOn?: number[];
}

export class CreateProcessTemplateDto {
  @ApiProperty({ description: 'Process template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Step templates', type: [CreateStepTemplateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepTemplateDto)
  stepTemplates: CreateStepTemplateDto[];
}