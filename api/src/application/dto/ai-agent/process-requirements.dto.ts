import { ApiProperty } from '@nestjs/swagger';

export interface Requirement {
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence?: number;
}

export class ProcessRequirementsDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'session-123',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Extracted requirements',
    type: 'array',
  })
  requirements: Requirement[];

  @ApiProperty({
    description: 'Metadata about the extraction',
  })
  metadata?: Record<string, any>;
}