import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignStepDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ 
    required: false,
    description: 'User ID to assign the step to. Pass null to unassign.',
    nullable: true
  })
  assigneeId?: number | null;

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'User ID performing the assignment',
    required: false 
  })
  userId?: number;
}