import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * AI Rate Limit Guard
 * レート制限チェック用ガード
 * 実際のレート制限チェックはUseCase層で実施するため、
 * このガードは常にtrueを返す（パススルー実装）
 */
@Injectable()
export class AIRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // レート制限チェックはUseCase層で実施
    // - StartInterviewSessionUseCase
    // - ProcessUserMessageUseCase
    // などで個別にAIRateLimitServiceを使用してチェック
    return true;
  }
}