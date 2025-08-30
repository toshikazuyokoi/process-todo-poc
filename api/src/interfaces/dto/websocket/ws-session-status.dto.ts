import { IsEnum, IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../../../domain/ai-agent/enums/session-status.enum';

/**
 * WebSocket Session Status DTO
 */
export class WsSessionStatusDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ enum: SessionStatus, description: 'Session status' })
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Timestamp of the event' })
  @IsDateString()
  timestamp: string;
}

/**
 * Join Session Request DTO
 */
export class WsJoinSessionDto {
  @ApiProperty({ description: 'Session ID to join' })
  @IsString()
  sessionId: string;
}

/**
 * Leave Session Request DTO
 */
export class WsLeaveSessionDto {
  @ApiProperty({ description: 'Session ID to leave' })
  @IsString()
  sessionId: string;
}

/**
 * Request Session Status DTO
 */
export class WsRequestSessionStatusDto {
  @ApiProperty({ description: 'Session ID to check status' })
  @IsString()
  sessionId: string;
}

/**
 * Session Created Notification DTO
 */
export class WsSessionCreatedDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User ID who created the session' })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({ description: 'Session context' })
  @IsOptional()
  context?: any;

  @ApiPropertyOptional({ description: 'Welcome message' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  timestamp: string;
}