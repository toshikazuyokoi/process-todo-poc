'use client';

import { useState, useEffect } from 'react';
import { GeneratedTemplate } from '../types';
import { ProcessTemplate } from '@/app/types';
import { 
  convertGeneratedToProcess, 
  convertProcessToGenerated,
  validateTemplateConversion,
  mergeAIMetadata
} from '../utils/template-converter';
import { StepTemplateEditor } from '@/app/components/templates/step-template-editor';
import { ConfidenceDisplay } from './confidence-display';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Save, 
  X, 
  AlertCircle, 
  Wand2,
  FileText,
  Info,
  Edit3
} from 'lucide-react';
import { clsx } from 'clsx';

interface TemplateEditorProps {
  generatedTemplate: GeneratedTemplate;
  onSave?: (template: ProcessTemplate) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Template Editor Component
 * Wrapper for existing StepTemplateEditor with AI metadata preservation
 */
export function TemplateEditor({
  generatedTemplate,
  onSave,
  onCancel,
  className = '',
}: TemplateEditorProps) {
  // Convert AI template to process template for editing
  const [processTemplate, setProcessTemplate] = useState<ProcessTemplate>(() => 
    convertGeneratedToProcess(generatedTemplate)
  );
  
  const [errors, setErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);

  // Track AI metadata separately
  const [aiMetadata] = useState({
    confidence: generatedTemplate.metadata.confidence,
    sources: generatedTemplate.metadata.sources,
    generatedAt: generatedTemplate.metadata.generatedAt,
    generationTime: generatedTemplate.metadata.generationTime,
  });

  // Validate on changes
  useEffect(() => {
    const validation = validateTemplateConversion(processTemplate);
    setErrors(validation.errors);
  }, [processTemplate]);

  const handleNameChange = (name: string) => {
    setProcessTemplate(prev => ({ ...prev, name }));
    setHasChanges(true);
  };

  const handleDescriptionChange = (description: string) => {
    // Note: ProcessTemplate doesn't have description, but we can track it
    setHasChanges(true);
  };

  const handleStepsChange = (steps: any[]) => {
    setProcessTemplate(prev => ({ ...prev, stepTemplates: steps }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (errors.length > 0) {
      alert('テンプレートにエラーがあります。修正してから保存してください。');
      return;
    }

    // Merge AI metadata with the process template
    const templateWithMetadata = mergeAIMetadata(processTemplate, {
      ...aiMetadata,
      extractedRequirements: [], // This would come from the parent component if needed
    });

    onSave?.(templateWithMetadata);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (!confirm('変更が保存されていません。本当にキャンセルしますか？')) {
        return;
      }
    }
    onCancel?.();
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wand2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI生成テンプレートの編集</h2>
              <p className="text-sm text-gray-600 mt-1">
                生成されたテンプレートを編集して保存できます
              </p>
            </div>
          </div>
          <ConfidenceDisplay 
            confidence={aiMetadata.confidence} 
            size="sm"
            showBar={false}
          />
        </div>

        {/* AI Metadata Info */}
        {showMetadata && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  AI生成情報
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs text-blue-700">
                  <div>
                    <span className="font-medium">生成日時:</span>{' '}
                    {new Date(aiMetadata.generatedAt).toLocaleString('ja-JP')}
                  </div>
                  <div>
                    <span className="font-medium">処理時間:</span>{' '}
                    {(aiMetadata.generationTime / 1000).toFixed(1)}秒
                  </div>
                  <div>
                    <span className="font-medium">参照ソース:</span>{' '}
                    {aiMetadata.sources.length}件
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMetadata(false)}
                className="text-blue-600 hover:text-blue-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-900 font-medium mb-2">
                  検証エラー
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Basic Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          基本情報
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              テンプレート名
            </label>
            <Input
              value={processTemplate.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="テンプレート名を入力"
              className={errors.some(e => e.includes('テンプレート名')) ? 'border-red-500' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明（オプション）
            </label>
            <Textarea
              defaultValue={generatedTemplate.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="テンプレートの説明を入力"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                バージョン
              </label>
              <Input
                value={processTemplate.version}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={processTemplate.isActive}
                  onChange={(e) => {
                    setProcessTemplate(prev => ({ ...prev, isActive: e.target.checked }));
                    setHasChanges(true);
                  }}
                  className="rounded"
                />
                <span className="text-sm">アクティブ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Editor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-gray-600" />
          プロセスステップ
        </h3>
        
        <StepTemplateEditor
          steps={processTemplate.stepTemplates || []}
          onChange={handleStepsChange}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-sm text-gray-600">
          {hasChanges && (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              未保存の変更があります
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={errors.length > 0}
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}