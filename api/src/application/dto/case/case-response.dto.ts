import { ApiProperty } from '@nestjs/swagger';

export class StepInstanceResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  caseId: number;

  @ApiProperty()
  templateId: number | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startDateUtc: Date | null;

  @ApiProperty()
  dueDateUtc: Date | null;

  @ApiProperty()
  assigneeId: number | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  locked: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CaseResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  processId: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  goalDateUtc: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdBy: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [StepInstanceResponseDto] })
  stepInstances: StepInstanceResponseDto[];

  @ApiProperty()
  progress: number;
}