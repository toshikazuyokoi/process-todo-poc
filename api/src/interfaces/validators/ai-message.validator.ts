import { Injectable } from '@nestjs/common';
import { BaseValidator, ValidationResult } from './base.validator';
import { SendMessageDto } from '../../application/dto/ai-agent/send-message.dto';
import { VALIDATION_CONSTANTS } from './validation.constants';

/**
 * Session context for validation
 * 最小実装のため簡略化
 */
export interface SessionContext {
  sessionId: string;
  status: 'active' | 'expired' | 'completed';
  requirementsCount?: number;
}

/**
 * AI Message Validator
 * メッセージ処理時のビジネスルール検証
 * 最小実装: 要件数上限チェックとセッション状態検証
 */
@Injectable()
export class AIMessageValidator extends BaseValidator<SendMessageDto> {
  constructor() {
    super('AIMessageValidator');
  }

  /**
   * Validate message with session context
   * @param dto - SendMessageDto
   * @param session - SessionContext (optional)
   * @returns ValidationResult
   */
  async validate(
    dto: SendMessageDto,
    session?: SessionContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // セッション状態の基本検証
    if (session) {
      const sessionError = this.validateSessionState(session);
      if (sessionError) {
        errors.push(sessionError);
      }

      // 要件数上限チェック
      const requirementsError = this.checkRequirementsLimit(session);
      if (requirementsError) {
        errors.push(requirementsError);
      }
    }

    // 将来の拡張ポイント:
    // - メッセージ頻度の制限（スパム防止）
    // - 会話コンテキストとの整合性チェック
    // - メッセージ内容の妥当性検証

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate session state
   * @param session - SessionContext
   * @returns Error message if invalid, undefined otherwise
   */
  private validateSessionState(session: SessionContext): string | undefined {
    if (session.status === 'expired') {
      return 'Session has expired';
    }
    if (session.status === 'completed') {
      return 'Session has already been completed';
    }
    return undefined;
  }

  /**
   * Check requirements limit
   * @param session - SessionContext
   * @returns Error message if limit exceeded, undefined otherwise
   */
  private checkRequirementsLimit(session: SessionContext): string | undefined {
    if (session.requirementsCount !== undefined) {
      return this.checkLimit(
        session.requirementsCount,
        VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION,
        'Requirements count',
      );
    }
    return undefined;
  }
}