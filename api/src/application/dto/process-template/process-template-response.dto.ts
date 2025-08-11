import { ApiProperty } from '@nestjs/swagger';

export class StepTemplateResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  processId: number;

  @ApiProperty()
  seq: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  basis: string;

  @ApiProperty()
  offsetDays: number;

  @ApiProperty()
  requiredArtifacts: Array<{ kind: string; description?: string }>;

  @ApiProperty()
  dependsOn: number[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProcessTemplateResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [StepTemplateResponseDto] })
  stepTemplates: StepTemplateResponseDto[];
}