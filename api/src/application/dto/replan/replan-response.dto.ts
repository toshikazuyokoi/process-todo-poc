import { ApiProperty } from '@nestjs/swagger';

export class StepDiffDto {
  @ApiProperty()
  stepId: number;

  @ApiProperty()
  stepName: string;

  @ApiProperty()
  oldStartDate: Date | null;

  @ApiProperty()
  newStartDate: Date;

  @ApiProperty()
  oldDueDate: Date | null;

  @ApiProperty()
  newDueDate: Date;

  @ApiProperty()
  isLocked: boolean;
}

export class ReplanPreviewDto {
  @ApiProperty()
  caseId: number;

  @ApiProperty()
  oldGoalDate: Date;

  @ApiProperty()
  newGoalDate: Date;

  @ApiProperty({ type: [StepDiffDto] })
  diffs: StepDiffDto[];

  @ApiProperty()
  criticalPath: number[];
}