import { IsString, IsOptional, IsObject, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionContextDto {
  @ApiProperty({
    description: 'Industry or business domain',
    example: 'software_development',
  })
  @IsString()
  industry: string;

  @ApiProperty({
    description: 'Type of process',
    example: 'project_management',
  })
  @IsString()
  processType: string;

  @ApiProperty({
    description: 'Goal or objective',
    example: 'Streamline software release process',
  })
  @IsString()
  goal: string;

  @ApiPropertyOptional({
    description: 'Team size',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  teamSize?: number;

  @ApiPropertyOptional({
    description: 'Expected timeline',
    example: '3 months',
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({
    description: 'Budget constraints',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({
    description: 'Compliance requirements',
    example: ['ISO27001', 'GDPR'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Key stakeholders',
    example: ['Product Owner', 'Development Team', 'QA Team'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stakeholders?: string[];

  @ApiPropertyOptional({
    description: 'Additional context information',
  })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}

export interface SessionContext {
  industry: string;
  processType: string;
  goal: string;
  teamSize?: number;
  timeline?: string;
  budget?: number;
  complianceRequirements?: string[];
  stakeholders?: string[];
  additionalInfo?: Record<string, any>;
}