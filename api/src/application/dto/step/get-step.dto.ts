import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetStepDto {
  @IsInt()
  @Min(1)
  @ApiProperty({ 
    description: 'Step ID to retrieve'
  })
  stepId: number;
}