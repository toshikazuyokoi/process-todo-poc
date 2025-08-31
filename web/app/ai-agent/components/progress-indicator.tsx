'use client';

import { TemplateGenerationStage } from '../types';
import { Button } from '@/app/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Search,
  Brain,
  Sparkles,
  Shield,
  FileCheck,
  X,
  RotateCw,
  Eye
} from 'lucide-react';
import { clsx } from 'clsx';

interface ProgressIndicatorProps {
  isGenerating: boolean;
  stage: TemplateGenerationStage | null;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  stepsCompleted?: number;
  totalSteps?: number;
  currentStep?: string;
  error?: {
    message: string;
    canRetry: boolean;
  };
  preview?: {
    title: string;
    description: string;
    stepCount: number;
    estimatedDuration: number;
    confidence: number;
  };
  onCancel?: () => void;
  onRetry?: () => void;
  onPreview?: () => void;
  className?: string;
}

/**
 * Progress Indicator Component
 * Shows template generation progress with stage information
 */
export function ProgressIndicator({
  isGenerating,
  stage,
  progress,
  message,
  estimatedTimeRemaining,
  stepsCompleted,
  totalSteps,
  currentStep,
  error,
  preview,
  onCancel,
  onRetry,
  onPreview,
  className = '',
}: ProgressIndicatorProps) {
  if (!isGenerating && !error && !preview) {
    return null;
  }

  /**
   * Get stage icon
   */
  const getStageIcon = () => {
    if (error) return <XCircle className="w-5 h-5 text-red-500" />;
    if (progress === 100) return <CheckCircle className="w-5 h-5 text-green-500" />;

    switch (stage) {
      case TemplateGenerationStage.INITIALIZING:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case TemplateGenerationStage.RESEARCHING:
        return <Search className="w-5 h-5 text-blue-500 animate-pulse" />;
      case TemplateGenerationStage.ANALYZING:
        return <Brain className="w-5 h-5 text-purple-500 animate-pulse" />;
      case TemplateGenerationStage.GENERATING:
        return <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case TemplateGenerationStage.VALIDATING:
        return <Shield className="w-5 h-5 text-green-500 animate-pulse" />;
      case TemplateGenerationStage.FINALIZING:
        return <FileCheck className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  /**
   * Get stage label
   */
  const getStageLabel = () => {
    if (error) return 'Error';
    if (progress === 100) return 'Completed';

    switch (stage) {
      case TemplateGenerationStage.INITIALIZING:
        return 'Initializing';
      case TemplateGenerationStage.RESEARCHING:
        return 'Researching';
      case TemplateGenerationStage.ANALYZING:
        return 'Analyzing';
      case TemplateGenerationStage.GENERATING:
        return 'Generating';
      case TemplateGenerationStage.VALIDATING:
        return 'Validating';
      case TemplateGenerationStage.FINALIZING:
        return 'Finalizing';
      default:
        return 'Processing';
    }
  };

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return null;
    
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) return `${minutes}m`;
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  const timeRemaining = formatTimeRemaining(estimatedTimeRemaining);
  const stageLabel = getStageLabel();

  return (
    <div className={clsx(
      'bg-white border-b shadow-sm',
      className
    )}>
      <div className="px-4 py-3">
        {/* Main content */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {getStageIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{stageLabel}</span>
                {timeRemaining && !error && (
                  <span className="text-xs text-gray-500">
                    (~{timeRemaining} remaining)
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {preview && onPreview && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPreview}
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            )}
            {error && onRetry && error.canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="gap-1"
              >
                <RotateCw className="w-4 h-4" />
                Retry
              </Button>
            )}
            {isGenerating && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!error && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={clsx(
                  'h-full transition-all duration-500',
                  progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Step counter */}
            {totalSteps && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {currentStep && `Step: ${currentStep}`}
                </span>
                <span>
                  {stepsCompleted || 0} / {totalSteps} steps
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        )}

        {/* Preview info */}
        {preview && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">{preview.title}</p>
                <p className="text-xs text-green-700 mt-0.5">{preview.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-green-600">
                  <span>{preview.stepCount} steps</span>
                  <span>•</span>
                  <span>{preview.estimatedDuration} days</span>
                  <span>•</span>
                  <span>{Math.round(preview.confidence * 100)}% confidence</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage indicators */}
      {isGenerating && !error && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            {Object.values(TemplateGenerationStage).map((stageValue, index) => {
              const isCompleted = getStageIndex(stage) > index;
              const isCurrent = stageValue === stage;
              const isPending = getStageIndex(stage) < index;

              return (
                <div
                  key={stageValue}
                  className="flex items-center"
                  style={{ flex: index < 5 ? 1 : 0 }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                        isCompleted && 'bg-green-500 text-white',
                        isCurrent && 'bg-blue-500 text-white animate-pulse',
                        isPending && 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className={clsx(
                      'text-xs mt-1 capitalize',
                      isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'
                    )}>
                      {stageValue.replace('_', ' ')}
                    </span>
                  </div>
                  {index < 5 && (
                    <div
                      className={clsx(
                        'flex-1 h-0.5 mx-2',
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get stage index for comparison
 */
function getStageIndex(stage: TemplateGenerationStage | null): number {
  if (!stage) return -1;
  const stages = Object.values(TemplateGenerationStage);
  return stages.indexOf(stage);
}