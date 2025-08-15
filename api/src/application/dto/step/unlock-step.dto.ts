import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnlockStepDto {
  @IsInt()
  @ApiProperty({ 
    description: 'Step ID to unlock'
  })
  stepId: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'User ID performing the unlock',
    required: false 
  })
  userId?: number;
}