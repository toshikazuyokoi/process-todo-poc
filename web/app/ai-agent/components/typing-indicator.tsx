'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface TypingIndicatorProps {
  stage?: string;
  estimatedTime?: number;
  className?: string;
}

/**
 * Typing Indicator Component
 * Shows AI processing status with animated dots and stage information
 */
export function TypingIndicator({ 
  stage, 
  estimatedTime, 
  className = '' 
}: TypingIndicatorProps) {
  const [dots, setDots] = useState(1);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /**
   * Get stage display text
   */
  const getStageText = () => {
    switch (stage) {
      case 'thinking':
        return 'Thinking';
      case 'researching':
        return 'Researching';
      case 'analyzing':
        return 'Analyzing requirements';
      case 'generating':
        return 'Generating response';
      default:
        return 'Processing';
    }
  };

  /**
   * Format estimated time
   */
  const formatTime = (seconds?: number) => {
    if (!seconds) return null;
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  const stageText = getStageText();
  const timeText = formatTime(estimatedTime);

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600">AI is {stageText}</span>
        <div className="flex gap-1 ml-1">
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={clsx(
                'w-2 h-2 rounded-full bg-blue-500 transition-opacity duration-300',
                dots >= dot ? 'opacity-100' : 'opacity-30'
              )}
              style={{
                animationDelay: `${dot * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Estimated time */}
      {timeText && (
        <span className="text-xs text-gray-500">
          (~{timeText} remaining)
        </span>
      )}

      {/* Stage-specific indicators */}
      {stage && (
        <div className="flex items-center gap-2">
          {stage === 'researching' && (
            <SearchingAnimation />
          )}
          {stage === 'analyzing' && (
            <AnalyzingAnimation />
          )}
          {stage === 'generating' && (
            <GeneratingAnimation />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Searching Animation Component
 */
function SearchingAnimation() {
  return (
    <div className="flex items-center gap-1">
      <svg
        className="w-4 h-4 text-blue-500 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-xs text-gray-500">Searching knowledge base</span>
    </div>
  );
}

/**
 * Analyzing Animation Component
 */
function AnalyzingAnimation() {
  const [bars, setBars] = useState([1, 2, 3, 2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) => {
        const newBars = [...prev];
        for (let i = 0; i < newBars.length; i++) {
          newBars[i] = Math.floor(Math.random() * 4) + 1;
        }
        return newBars;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-end gap-0.5">
        {bars.map((height, index) => (
          <div
            key={index}
            className="w-1 bg-blue-500 transition-all duration-300"
            style={{ height: `${height * 4}px` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 ml-1">Analyzing</span>
    </div>
  );
}

/**
 * Generating Animation Component
 */
function GeneratingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // Never reach 100% until actually done
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">Generating</span>
    </div>
  );
}