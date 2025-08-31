'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface SuggestionButtonsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Suggestion Buttons Component
 * Displays suggested questions/prompts that users can click to send
 */
export function SuggestionButtons({
  suggestions,
  onSelect,
  disabled = false,
  className = '',
}: SuggestionButtonsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  if (!suggestions || suggestions.length === 0 || isHidden) {
    return null;
  }

  const handleSelect = (suggestion: string, index: number) => {
    if (disabled) return;
    
    // Mark as selected
    setSelectedIndex(index);
    
    // Send the suggestion
    onSelect(suggestion);
    
    // Hide buttons after selection
    setTimeout(() => {
      setIsHidden(true);
    }, 300);
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <span>Suggested questions:</span>
      </div>

      {/* Suggestion buttons */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            size="sm"
            variant={selectedIndex === index ? 'primary' : 'outline'}
            onClick={() => handleSelect(suggestion, index)}
            disabled={disabled || selectedIndex !== null}
            className={clsx(
              'text-left justify-start gap-2 transition-all',
              'hover:shadow-md hover:scale-[1.02]',
              selectedIndex === index && 'animate-pulse',
              selectedIndex !== null && selectedIndex !== index && 'opacity-50'
            )}
          >
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-2">{suggestion}</span>
          </Button>
        ))}
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-500 italic">
        Click a suggestion to send it as your next message
      </p>
    </div>
  );
}

/**
 * Inline Suggestion Chips Component
 * Compact version for embedding in message list
 */
export function SuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
  className = '',
}: SuggestionButtonsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  if (!suggestions || suggestions.length === 0 || isHidden) {
    return null;
  }

  const handleSelect = (suggestion: string, index: number) => {
    if (disabled) return;
    
    setSelectedIndex(index);
    onSelect(suggestion);
    
    // Hide after animation
    setTimeout(() => {
      setIsHidden(true);
    }, 500);
  };

  return (
    <div className={clsx('mt-3', className)}>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSelect(suggestion, index)}
            disabled={disabled || selectedIndex !== null}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5',
              'text-xs rounded-full border transition-all',
              'hover:shadow-sm hover:scale-[1.05]',
              selectedIndex === index
                ? 'bg-blue-500 text-white border-blue-500 animate-pulse'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
              selectedIndex !== null && selectedIndex !== index && 'opacity-40',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <Sparkles className="w-3 h-3" />
            <span className="max-w-[200px] truncate">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}