import { Injectable } from '@nestjs/common';
import { BaseValidator, ValidationResult } from './base.validator';
import { 
  TemplateRecommendationDto, 
  StepRecommendationDto 
} from '../../application/dto/ai-agent/template-recommendation.dto';
import { VALIDATION_CONSTANTS } from './validation.constants';

/**
 * AI Template Validator
 * テンプレート生成時のビジネスルール検証
 * 最小実装: ステップ数上限と信頼度スコア下限チェック
 */
@Injectable()
export class AITemplateValidator extends BaseValidator<TemplateRecommendationDto> {
  constructor() {
    super('AITemplateValidator');
  }

  /**
   * Validate template recommendation
   * @param dto - TemplateRecommendationDto
   * @returns ValidationResult
   */
  async validate(dto: TemplateRecommendationDto): Promise<ValidationResult> {
    const errors: string[] = [];

    // ステップ数上限チェック
    const stepsError = this.checkStepsLimit(dto.steps);
    if (stepsError) {
      errors.push(stepsError);
    }

    // 信頼度スコア下限チェック
    const confidenceError = this.checkConfidenceScore(dto.confidence);
    if (confidenceError) {
      errors.push(confidenceError);
    }

    // 代替テンプレートの検証（存在する場合）
    if (dto.alternatives && dto.alternatives.length > 0) {
      for (let i = 0; i < dto.alternatives.length; i++) {
        const altErrors = await this.validateAlternative(dto.alternatives[i], i);
        errors.push(...altErrors);
      }
    }

    // 将来の拡張ポイント:
    // - 依存関係の循環参照チェック
    // - ステップ間の論理的整合性検証
    // - 必須ステップの存在確認
    // - 推定期間の妥当性チェック

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check steps limit
   * @param steps - Array of step recommendations
   * @returns Error message if limit exceeded, undefined otherwise
   */
  private checkStepsLimit(steps: StepRecommendationDto[]): string | undefined {
    if (!steps || steps.length === 0) {
      return 'Template must have at least one step';
    }
    
    return this.checkLimit(
      steps.length,
      VALIDATION_CONSTANTS.MAX_STEPS_PER_TEMPLATE,
      'Number of steps',
    );
  }

  /**
   * Check confidence score
   * @param confidence - Confidence score
   * @returns Error message if below minimum, undefined otherwise
   */
  private checkConfidenceScore(confidence: number): string | undefined {
    return this.checkMinimum(
      confidence,
      VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE,
      'Confidence score',
    );
  }

  /**
   * Validate alternative template
   * @param alternative - Alternative template
   * @param index - Alternative index
   * @returns Array of error messages
   */
  private async validateAlternative(
    alternative: TemplateRecommendationDto,
    index: number,
  ): Promise<string[]> {
    const errors: string[] = [];
    const prefix = `Alternative ${index + 1}: `;

    // ステップ数チェック
    const stepsError = this.checkStepsLimit(alternative.steps);
    if (stepsError) {
      errors.push(prefix + stepsError);
    }

    // 信頼度スコアチェック
    const confidenceError = this.checkConfidenceScore(alternative.confidence);
    if (confidenceError) {
      errors.push(prefix + confidenceError);
    }

    return errors;
  }

  /**
   * Check for circular dependencies (future implementation)
   * @param steps - Array of steps
   * @returns true if circular dependency detected
   */
  private detectCircularDependencies(steps: StepRecommendationDto[]): boolean {
    // 将来実装: 依存関係グラフを構築して循環を検出
    // 現在は常にfalseを返す（最小実装）
    return false;
  }
}