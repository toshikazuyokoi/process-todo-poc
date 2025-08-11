import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateStepTemplateDto } from './create-process-template.dto';

export class UpdateProcessTemplateDto {
  @ApiProperty({ description: 'Process template name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Is template active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Step templates', type: [CreateStepTemplateDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepTemplateDto)
  @IsOptional()
  stepTemplates?: CreateStepTemplateDto[];
}