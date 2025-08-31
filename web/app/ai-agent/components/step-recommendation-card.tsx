'use client';

import { useState } from 'react';
import { TemplateStep } from '../types';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  GitBranch, 
  FileText,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { clsx } from 'clsx';

interface StepRecommendationCardProps {
  step: TemplateStep;
  index: number;
  dependencies?: string[];
  allSteps: TemplateStep[];
  className?: string;
}

/**
 * Step Recommendation Card Component
 * Displays detailed information about each recommended step
 */
export function StepRecommendationCard({
  step,
  index,
  dependencies,
  allSteps,
  className = '',
}: StepRecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find dependency step names
  const dependencySteps = dependencies?.map(depId => 
    allSteps.find(s => s.id === depId)
  ).filter(Boolean) || [];

  // Determine step type based on position and dependencies
  const stepType = getStepType(index, allSteps.length, dependencies);
  const stepIcon = getStepIcon(stepType);
  const stepColor = getStepColor(stepType);

  return (
    <div className={clsx(
      'border rounded-lg transition-all',
      isExpanded ? 'shadow-md' : 'shadow-sm',
      className
    )}>
      {/* Card Header */}
      <div 
        className={clsx(
          'px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
          'border-l-4',
          stepColor
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Step Number */}
            <div className="flex-shrink-0">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                'bg-gray-100 text-gray-700'
              )}>
                {index + 1}
              </div>
            </div>

            {/* Step Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {stepIcon}
                <h4 className="font-medium text-gray-900">{step.name}</h4>
              </div>
              
              {/* Quick Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{step.duration}日</span>
                </div>
                
                {dependencySteps.length > 0 && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    <span>依存: {dependencySteps.length}件</span>
                  </div>
                )}
              </div>

              {/* Brief Description (shown when collapsed) */}
              {!isExpanded && step.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {step.description}
                </p>
              )}
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="ml-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-4 border-t bg-gray-50">
          {/* Full Description */}
          {step.description && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                詳細説明
              </h5>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {step.description}
              </p>
            </div>
          )}

          {/* Dependencies */}
          {dependencySteps.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                依存ステップ
              </h5>
              <ul className="space-y-1">
                {dependencySteps.map((depStep, depIndex) => (
                  <li key={depStep?.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-xs flex items-center justify-center font-medium">
                      {allSteps.findIndex(s => s.id === depStep?.id) + 1}
                    </span>
                    <span>{depStep?.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Info className="w-4 h-4" />
              推奨事項
            </h5>
            <ul className="space-y-1 text-sm text-gray-600">
              {generateRecommendations(step, stepType).map((rec, recIndex) => (
                <li key={recIndex} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Warnings */}
          {generateWarnings(step, dependencies).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                注意事項
              </h5>
              <ul className="space-y-1 text-sm text-gray-600">
                {generateWarnings(step, dependencies).map((warning, warnIndex) => (
                  <li key={warnIndex} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Determine step type based on position and dependencies
 */
function getStepType(index: number, totalSteps: number, dependencies?: string[]): string {
  if (index === 0) return 'start';
  if (index === totalSteps - 1) return 'end';
  if (dependencies && dependencies.length > 1) return 'merge';
  return 'process';
}

/**
 * Get icon for step type
 */
function getStepIcon(stepType: string) {
  switch (stepType) {
    case 'start':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'end':
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    case 'merge':
      return <GitBranch className="w-4 h-4 text-purple-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
}

/**
 * Get border color for step type
 */
function getStepColor(stepType: string): string {
  switch (stepType) {
    case 'start':
      return 'border-l-green-500';
    case 'end':
      return 'border-l-blue-500';
    case 'merge':
      return 'border-l-purple-500';
    default:
      return 'border-l-gray-300';
  }
}

/**
 * Generate recommendations for the step
 */
function generateRecommendations(step: TemplateStep, stepType: string): string[] {
  const recommendations: string[] = [];

  // Add type-specific recommendations
  if (stepType === 'start') {
    recommendations.push('プロジェクト開始前に関係者全員への通知を行う');
    recommendations.push('必要なリソースの確保を事前に確認する');
  } else if (stepType === 'end') {
    recommendations.push('成果物の最終確認を実施する');
    recommendations.push('完了報告書を作成する');
  }

  // Duration-based recommendations
  if (step.duration > 5) {
    recommendations.push('長期タスクのため、中間レビューの設定を検討する');
  }
  if (step.duration === 1) {
    recommendations.push('短期タスクのため、事前準備を十分に行う');
  }

  // Generic recommendations
  recommendations.push('進捗状況を定期的に報告する');

  return recommendations;
}

/**
 * Generate warnings for the step
 */
function generateWarnings(step: TemplateStep, dependencies?: string[]): string[] {
  const warnings: string[] = [];

  // Dependency warnings
  if (dependencies && dependencies.length > 2) {
    warnings.push('複数の依存関係があるため、スケジュール調整に注意が必要');
  }

  // Duration warnings
  if (step.duration > 10) {
    warnings.push('長期間のタスクのため、リスク管理計画を策定することを推奨');
  }

  // Name-based warnings
  if (step.name.includes('テスト') || step.name.includes('test')) {
    warnings.push('テスト環境の準備状況を事前に確認する');
  }
  if (step.name.includes('リリース') || step.name.includes('release')) {
    warnings.push('リリース手順書の確認とロールバック計画の準備が必要');
  }

  return warnings;
}