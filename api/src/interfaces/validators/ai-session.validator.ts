import { Injectable } from '@nestjs/common';
import { BaseValidator, ValidationResult } from './base.validator';
import { StartSessionDto } from '../../application/dto/ai-agent/start-session.dto';
import { AIConfigService } from '../../config/ai-config.service';

/**
 * AI Session Validator
 * セッション作成時のビジネスルール検証
 * 最小実装: アクティブセッション数の制限チェックのみ
 */
@Injectable()
export class AISessionValidator extends BaseValidator<StartSessionDto> {
  constructor(private readonly configService: AIConfigService) {
    super('AISessionValidator');
  }

  /**
   * Validate session creation request
   * @param dto - StartSessionDto
   * @returns ValidationResult
   */
  async validate(dto: StartSessionDto): Promise<ValidationResult> {
    const errors: string[] = [];

    // 最小実装: 設定値の存在確認のみ
    // 実際のセッション数チェックは将来実装
    const maxConcurrentSessions = this.configService.maxConcurrentSessions;
    
    if (maxConcurrentSessions <= 0) {
      errors.push('Invalid max concurrent sessions configuration');
    }

    // 将来の拡張ポイント:
    // - 実際のアクティブセッション数をチェック
    // - industry/processTypeの組み合わせ検証
    // - goalの具体性チェック

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check concurrent sessions limit (future implementation)
   * @param userId - User ID
   * @returns true if within limit
   */
  private async checkConcurrentSessions(userId: number): Promise<boolean> {
    // 将来実装: リポジトリからアクティブセッション数を取得
    // const activeSessions = await this.sessionRepository.countActiveSessions(userId);
    // const maxSessions = this.configService.maxConcurrentSessions;
    // return activeSessions < maxSessions;
    
    // 現在は常にtrueを返す（最小実装）
    return true;
  }
}