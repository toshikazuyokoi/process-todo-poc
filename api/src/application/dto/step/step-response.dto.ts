import { ApiProperty } from '@nestjs/swagger';

export class StepResponseDto {
  @ApiProperty({ description: 'Step ID' })
  id: number;

  @ApiProperty({ description: 'Case ID' })
  caseId: number;

  @ApiProperty({ description: 'Template ID' })
  templateId: number;

  @ApiProperty({ description: 'Step name' })
  name: string;

  @ApiProperty({ description: 'Start date in UTC', nullable: true })
  startDateUtc: Date | null;

  @ApiProperty({ description: 'Due date in UTC', nullable: true })
  dueDateUtc: Date | null;

  @ApiProperty({ description: 'Assignee user ID', nullable: true })
  assigneeId: number | null;

  @ApiProperty({ description: 'Assignee user name', required: false })
  assigneeName?: string;

  @ApiProperty({ description: 'Step status' })
  status: string;

  @ApiProperty({ description: 'Whether the step is locked' })
  locked: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether the step is overdue' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Days until due date', nullable: true })
  daysUntilDue: number | null;
}