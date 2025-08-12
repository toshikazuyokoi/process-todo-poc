'use client';

import { useState } from 'react';
import { useUndoRedo } from '@/app/hooks/use-undo-redo';
import { Undo2, Redo2, History, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';

interface Step {
  id: string;
  name: string;
  description: string;
  requiredDays: number;
  order: number;
}

interface Template {
  name: string;
  description: string;
  steps: Step[];
}

interface TemplateEditorWithUndoProps {
  initialTemplate?: Template;
  onSave?: (template: Template) => void;
}

export function TemplateEditorWithUndo({ 
  initialTemplate,
  onSave 
}: TemplateEditorWithUndoProps) {
  const defaultTemplate: Template = initialTemplate || {
    name: '',
    description: '',
    steps: [],
  };

  const {
    state: template,
    setState: setTemplate,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistory,
    historySize,
    currentIndex,
  } = useUndoRedo(defaultTemplate, {
    maxHistorySize: 30,
    enableKeyboardShortcuts: true,
  });

  const [showHistory, setShowHistory] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // テンプレート名を更新
  const updateTemplateName = (name: string) => {
    setTemplate((draft) => {
      draft.name = name;
    });
  };

  // テンプレート説明を更新
  const updateTemplateDescription = (description: string) => {
    setTemplate((draft) => {
      draft.description = description;
    });
  };

  // ステップを追加
  const addStep = () => {
    const newStep: Step = {
      id: `step-${Date.now()}`,
      name: `新しいステップ`,
      description: '',
      requiredDays: 1,
      order: template.steps.length + 1,
    };

    setTemplate((draft) => {
      draft.steps.push(newStep);
    });
  };

  // ステップを削除
  const deleteStep = (stepId: string) => {
    setTemplate((draft) => {
      const index = draft.steps.findIndex((s) => s.id === stepId);
      if (index !== -1) {
        draft.steps.splice(index, 1);
        // 順序を再計算
        draft.steps.forEach((step, i) => {
          step.order = i + 1;
        });
      }
    });
  };

  // ステップを更新
  const updateStep = (stepId: string, updates: Partial<Step>) => {
    setTemplate((draft) => {
      const step = draft.steps.find((s) => s.id === stepId);
      if (step) {
        Object.assign(step, updates);
      }
    });
  };

  // ステップの順序を変更
  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setTemplate((draft) => {
      const index = draft.steps.findIndex((s) => s.id === stepId);
      if (index === -1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= draft.steps.length) return;

      // ステップを入れ替え
      [draft.steps[index], draft.steps[newIndex]] = 
      [draft.steps[newIndex], draft.steps[index]];

      // 順序を再計算
      draft.steps.forEach((step, i) => {
        step.order = i + 1;
      });
    });
  };

  // 履歴の操作を文字列化
  const getActionDescription = (state: Template, index: number): string => {
    if (index === 0) return '初期状態';
    
    const history = getHistory();
    const prevState = history.past[index - 1] || defaultTemplate;
    
    // 変更内容を検出
    if (state.name !== prevState.name) {
      return `テンプレート名を「${state.name}」に変更`;
    }
    if (state.description !== prevState.description) {
      return `説明を更新`;
    }
    if (state.steps.length > prevState.steps.length) {
      return `ステップを追加`;
    }
    if (state.steps.length < prevState.steps.length) {
      return `ステップを削除`;
    }
    
    return '内容を編集';
  };

  return (
    <div className="space-y-6">
      {/* アンドゥ/リドゥバー */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              title="アンドゥ (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              title="リドゥ (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 ml-2">
              履歴: {currentIndex + 1}/{historySize}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-1" />
            履歴を表示
          </Button>
        </div>

        {/* 履歴パネル */}
        {showHistory && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-medium mb-2">編集履歴</h3>
            <div className="space-y-1 max-h-48 overflow-auto">
              {getHistory().past.concat([template]).map((state, index) => (
                <div
                  key={index}
                  className={`text-sm px-2 py-1 rounded ${
                    index === currentIndex
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {getActionDescription(state, index)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* テンプレート基本情報 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">テンプレート情報</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            テンプレート名
          </label>
          <Input
            value={template.name}
            onChange={(e) => updateTemplateName(e.target.value)}
            placeholder="例: 標準プロジェクトテンプレート"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <Textarea
            value={template.description}
            onChange={(e) => updateTemplateDescription(e.target.value)}
            placeholder="このテンプレートの説明を入力..."
            rows={3}
          />
        </div>
      </div>

      {/* ステップ一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">ステップ一覧</h2>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            ステップを追加
          </Button>
        </div>

        {template.steps.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            ステップがまだありません
          </p>
        ) : (
          <div className="space-y-2">
            {template.steps.map((step, index) => (
              <div
                key={step.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
                data-testid={`step-${step.id}`}
              >
                {editingStepId === step.id ? (
                  // 編集モード
                  <div className="space-y-2">
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(step.id, { name: e.target.value })}
                      placeholder="ステップ名"
                    />
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                      placeholder="説明"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={step.requiredDays}
                        onChange={(e) => updateStep(step.id, { requiredDays: parseInt(e.target.value) || 1 })}
                        className="w-20"
                        min={1}
                      />
                      <span className="text-sm text-gray-500">日</span>
                      <Button
                        size="sm"
                        onClick={() => setEditingStepId(null)}
                      >
                        完了
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {step.order}. {step.name}
                      </div>
                      {step.description && (
                        <div className="text-sm text-gray-600">{step.description}</div>
                      )}
                      <div className="text-sm text-gray-500">
                        必要日数: {step.requiredDays}日
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={index === template.steps.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingStepId(step.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteStep(step.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={() => onSave(template)} data-testid="save-button">
            テンプレートを保存
          </Button>
        </div>
      )}
    </div>
  );
}