import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class BulkDeleteCasesDto {
  @ApiProperty({
    description: 'Array of case IDs to delete',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  caseIds: number[];
}