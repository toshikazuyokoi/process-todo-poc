'use client';

import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfidenceDisplayProps {
  confidence: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  showBar?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Confidence Display Component
 * Visual representation of AI confidence levels
 */
export function ConfidenceDisplay({
  confidence,
  showLabel = true,
  showPercentage = true,
  showBar = true,
  showIcon = true,
  size = 'md',
  className = '',
}: ConfidenceDisplayProps) {
  const percentage = Math.round(confidence * 100);
  const level = getConfidenceLevel(confidence);
  const { color, bgColor, icon, label, description } = getConfidenceConfig(level);

  // Size configurations
  const sizeConfig = {
    sm: {
      barHeight: 'h-1',
      fontSize: 'text-xs',
      iconSize: 'w-3 h-3',
      padding: 'px-2 py-0.5',
      gap: 'gap-1',
    },
    md: {
      barHeight: 'h-2',
      fontSize: 'text-sm',
      iconSize: 'w-4 h-4',
      padding: 'px-3 py-1',
      gap: 'gap-2',
    },
    lg: {
      barHeight: 'h-3',
      fontSize: 'text-base',
      iconSize: 'w-5 h-5',
      padding: 'px-4 py-2',
      gap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={clsx('inline-flex items-center', config.gap, className)}>
      {/* Icon */}
      {showIcon && (
        <div className={clsx('flex items-center', color)} title={description}>
          {icon(config.iconSize)}
        </div>
      )}

      {/* Label */}
      {showLabel && (
        <span className={clsx(config.fontSize, 'font-medium', color)}>
          {label}
        </span>
      )}

      {/* Percentage */}
      {showPercentage && (
        <span className={clsx(config.fontSize, 'font-bold', color)}>
          {percentage}%
        </span>
      )}

      {/* Progress Bar */}
      {showBar && (
        <div className="flex items-center gap-2">
          <div className={clsx(
            'relative overflow-hidden rounded-full bg-gray-200',
            config.barHeight,
            size === 'sm' ? 'w-16' : size === 'md' ? 'w-24' : 'w-32'
          )}>
            <div
              className={clsx(
                'absolute left-0 top-0 h-full transition-all duration-500',
                bgColor
              )}
              style={{ width: `${percentage}%` }}
            />
            {/* Animated pulse effect for high confidence */}
            {level === 'high' && (
              <div
                className={clsx(
                  'absolute left-0 top-0 h-full opacity-30 animate-pulse',
                  bgColor
                )}
                style={{ width: `${percentage}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact confidence badge variant
 */
interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);
  const level = getConfidenceLevel(confidence);
  const { color, bgColor, icon } = getConfidenceConfig(level);

  return (
    <div 
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        bgColor.replace('bg-', 'bg-opacity-20 bg-'),
        color,
        className
      )}
      title={`信頼度: ${percentage}%`}
    >
      {icon('w-3 h-3')}
      <span>{percentage}%</span>
    </div>
  );
}

/**
 * Detailed confidence meter variant
 */
interface ConfidenceMeterProps {
  confidence: number;
  showDetails?: boolean;
  className?: string;
}

export function ConfidenceMeter({ 
  confidence, 
  showDetails = true,
  className = '' 
}: ConfidenceMeterProps) {
  const percentage = Math.round(confidence * 100);
  const level = getConfidenceLevel(confidence);
  const { color, bgColor, label, description } = getConfidenceConfig(level);

  return (
    <div className={clsx('space-y-2', className)}>
      {/* Meter */}
      <div className="relative">
        {/* Background segments */}
        <div className="flex gap-1 h-6 rounded-lg overflow-hidden bg-gray-100">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={clsx(
                'flex-1 transition-all duration-300',
                i < Math.floor(confidence * 10) ? bgColor : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        
        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-md">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span className={clsx('font-medium', color)}>{label}</span>
          <span className="text-gray-500">{description}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Determine confidence level
 */
function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Get configuration for confidence level
 */
function getConfidenceConfig(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        icon: (className: string) => <TrendingUp className={className} />,
        label: '高信頼度',
        description: 'AIが高い確信度を持って推奨しています',
      };
    case 'medium':
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        icon: (className: string) => <Minus className={className} />,
        label: '中信頼度',
        description: 'AIが一定の確信度を持って推奨しています',
      };
    case 'low':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        icon: (className: string) => <TrendingDown className={className} />,
        label: '低信頼度',
        description: 'AIの確信度が低いため、人による確認を推奨します',
      };
  }
}