import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockStepDto {
  @IsInt()
  @ApiProperty({ 
    description: 'Step ID to lock'
  })
  stepId: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ 
    description: 'User ID performing the lock',
    required: false 
  })
  userId?: number;
}