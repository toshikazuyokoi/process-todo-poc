'use client';

import { useState } from 'react';
import { GeneratedTemplate, TemplateStep } from '../types';
import { StepRecommendationCard } from './step-recommendation-card';
import { RequirementsSummary } from './requirements-summary';
import { ConfidenceDisplay } from './confidence-display';
import { Button } from '@/app/components/ui/button';
import { 
  FileText, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  GitBranch,
  Sparkles,
  Calendar
} from 'lucide-react';
import { clsx } from 'clsx';

interface TemplatePreviewProps {
  template: GeneratedTemplate;
  requirements?: Array<{
    category: string;
    content: string;
    priority: string;
    confidence: number;
  }>;
  onEdit?: () => void;
  className?: string;
}

/**
 * Template Preview Component
 * Read-only display of AI-generated template with metadata
 */
export function TemplatePreview({
  template,
  requirements,
  onEdit,
  className = '',
}: TemplatePreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    steps: true,
    requirements: false,
    metadata: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate total duration
  const totalDuration = template.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  // Build dependency map for visualization
  const dependencyMap = new Map<string, string[]>();
  template.steps.forEach(step => {
    if (step.dependencies && step.dependencies.length > 0) {
      dependencyMap.set(step.id, step.dependencies);
    }
  });

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <div className="ml-auto">
                <ConfidenceDisplay confidence={template.metadata.confidence} />
              </div>
            </div>
            <p className="text-gray-600 mb-4">{template.description}</p>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{template.steps.length} ステップ</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">推定期間: {totalDuration}日</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  生成時間: {(template.metadata.generationTime / 1000).toFixed(1)}秒
                </span>
              </div>
            </div>
          </div>
          
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <Edit className="w-4 h-4 mr-2" />
              編集
            </Button>
          )}
        </div>
      </div>

      {/* Steps Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('steps')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">プロセスステップ</h3>
            <span className="text-sm text-gray-500">({template.steps.length})</span>
          </div>
          {expandedSections.steps ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.steps && (
          <div className="px-6 pb-6">
            {/* Process Flow Visualization */}
            <div className="mb-6 overflow-x-auto">
              <ProcessFlowVisualization steps={template.steps} />
            </div>
            
            {/* Step Cards */}
            <div className="space-y-3">
              {template.steps.map((step, index) => (
                <StepRecommendationCard
                  key={step.id}
                  step={step}
                  index={index}
                  dependencies={dependencyMap.get(step.id)}
                  allSteps={template.steps}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Requirements Section */}
      {requirements && requirements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => toggleSection('requirements')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">抽出された要件</h3>
              <span className="text-sm text-gray-500">({requirements.length})</span>
            </div>
            {expandedSections.requirements ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.requirements && (
            <div className="px-6 pb-6">
              <RequirementsSummary requirements={requirements} />
            </div>
          )}
        </div>
      )}

      {/* Metadata Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold">生成情報</h3>
          {expandedSections.metadata ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.metadata && (
          <div className="px-6 pb-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">生成日時</dt>
                <dd className="mt-1 font-medium">
                  {new Date(template.metadata.generatedAt).toLocaleString('ja-JP')}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">信頼度</dt>
                <dd className="mt-1 font-medium">
                  {(template.metadata.confidence * 100).toFixed(0)}%
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">処理時間</dt>
                <dd className="mt-1 font-medium">
                  {(template.metadata.generationTime / 1000).toFixed(1)}秒
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">参照ソース数</dt>
                <dd className="mt-1 font-medium">
                  {template.metadata.sources.length}件
                </dd>
              </div>
            </dl>
            
            {template.metadata.sources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">参照ソース</h4>
                <ul className="space-y-1">
                  {template.metadata.sources.map((source, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {source}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Process Flow Visualization Component
 * Simple flowchart-style visualization of steps
 */
function ProcessFlowVisualization({ steps }: { steps: TemplateStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-3 py-2 min-w-[100px] text-center">
            <div className="text-xs font-medium text-blue-900">{step.name}</div>
            <div className="text-xs text-blue-600 mt-1">{step.duration}日</div>
          </div>
          {index < steps.length - 1 && (
            <div className="mx-1 text-gray-400">→</div>
          )}
        </div>
      ))}
    </div>
  );
}