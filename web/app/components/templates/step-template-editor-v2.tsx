'use client';

import { useState, useEffect } from 'react';
import { StepTemplate } from '@/app/types';
import { SortableStepsList } from './sortable-steps-list';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { X } from 'lucide-react';

interface StepTemplateEditorV2Props {
  steps: StepTemplate[];
  onChange: (steps: StepTemplate[]) => void;
}

interface StepFormData {
  id?: number;
  name: string;
  basis: 'goal' | 'prev';
  offsetDays: number;
  requiredDays?: number;
  bufferDays?: number;
  dependsOnJson?: number[];
}

export function StepTemplateEditorV2({ steps, onChange }: StepTemplateEditorV2Props) {
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [editingStep, setEditingStep] = useState<StepFormData | null>(null);
  const [showStepForm, setShowStepForm] = useState(false);

  // ステップテンプレートを内部形式に変換
  useEffect(() => {
    const convertedSteps = steps.map((step, index) => ({
      id: step.seq || index + 1,
      name: step.name,
      description: `基準: ${step.basis === 'goal' ? 'ゴール' : '前工程'}, オフセット: ${step.offsetDays}日`,
      requiredDays: step.offsetDays || 1,
      bufferDays: 0,
      order: step.seq || index + 1,
      basis: step.basis,
      offsetDays: step.offsetDays,
      dependsOn: step.dependsOn || [],
    }));
    setLocalSteps(convertedSteps);
  }, [steps]);

  // 順序変更時の処理
  const handleReorder = (reorderedSteps: any[]) => {
    setLocalSteps(reorderedSteps);
    
    // StepTemplate形式に変換して親コンポーネントに通知
    const convertedSteps: StepTemplate[] = reorderedSteps.map((step) => ({
      seq: step.order,
      name: step.name,
      basis: step.basis || 'prev',
      offsetDays: step.offsetDays || step.requiredDays || 1,
      requiredArtifacts: [],
      dependsOn: step.dependsOn || [],
    }));
    
    onChange(convertedSteps);
  };

  // ステップ追加
  const handleAddStep = () => {
    setEditingStep({
      name: `ステップ ${localSteps.length + 1}`,
      basis: 'prev',
      offsetDays: 1,
      requiredDays: 1,
      bufferDays: 0,
      dependsOnJson: [],
    });
    setShowStepForm(true);
  };

  // ステップ編集
  const handleEditStep = (step: any) => {
    setEditingStep({
      id: step.id,
      name: step.name,
      basis: step.basis || 'prev',
      offsetDays: step.offsetDays || step.requiredDays || 1,
      requiredDays: step.requiredDays || 1,
      bufferDays: step.bufferDays || 0,
      dependsOnJson: step.dependsOnJson || [],
    });
    setShowStepForm(true);
  };

  // ステップ削除
  const handleDeleteStep = (id: number) => {
    const updatedSteps = localSteps.filter((s) => s.id !== id);
    
    // 順序番号を振り直し
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
    
    handleReorder(reorderedSteps);
  };

  // ステップフォーム保存
  const handleSaveStep = () => {
    if (!editingStep) return;

    let updatedSteps;
    
    if (editingStep.id) {
      // 既存ステップの更新
      updatedSteps = localSteps.map((step) =>
        step.id === editingStep.id
          ? {
              ...step,
              name: editingStep.name,
              basis: editingStep.basis,
              offsetDays: editingStep.offsetDays,
              requiredDays: editingStep.requiredDays,
              bufferDays: editingStep.bufferDays,
              dependsOnJson: editingStep.dependsOnJson,
              description: `基準: ${editingStep.basis === 'goal' ? 'ゴール' : '前工程'}, オフセット: ${editingStep.offsetDays}日`,
            }
          : step
      );
    } else {
      // 新規ステップの追加
      const newStep = {
        id: Math.max(...localSteps.map((s) => s.id || 0), 0) + 1,
        name: editingStep.name,
        basis: editingStep.basis,
        offsetDays: editingStep.offsetDays,
        requiredDays: editingStep.requiredDays,
        bufferDays: editingStep.bufferDays,
        dependsOnJson: editingStep.dependsOnJson,
        order: localSteps.length + 1,
        description: `基準: ${editingStep.basis === 'goal' ? 'ゴール' : '前工程'}, オフセット: ${editingStep.offsetDays}日`,
      };
      updatedSteps = [...localSteps, newStep];
    }
    
    handleReorder(updatedSteps);
    setShowStepForm(false);
    setEditingStep(null);
  };

  return (
    <div>
      <SortableStepsList
        steps={localSteps}
        onReorder={handleReorder}
        onAdd={handleAddStep}
        onEdit={handleEditStep}
        onDelete={handleDeleteStep}
      />

      {/* ステップ編集フォーム（モーダル） */}
      {showStepForm && editingStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingStep.id ? 'ステップを編集' : '新しいステップ'}
              </h3>
              <button
                onClick={() => {
                  setShowStepForm(false);
                  setEditingStep(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="ステップ名"
                name="name"
                value={editingStep.name}
                onChange={(e) =>
                  setEditingStep({ ...editingStep, name: e.target.value })
                }
              />

              <Select
                label="基準"
                name="basis"
                value={editingStep.basis}
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    basis: e.target.value as 'goal' | 'prev',
                  })
                }
                options={[
                  { value: 'goal', label: 'ゴール基準' },
                  { value: 'prev', label: '前工程基準' },
                ]}
              />

              <Input
                label="オフセット日数"
                name="offsetDays"
                type="number"
                value={editingStep.offsetDays}
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    offsetDays: parseInt(e.target.value) || 0,
                  })
                }
              />

              <Input
                label="必要日数"
                name="requiredDays"
                type="number"
                value={editingStep.requiredDays}
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    requiredDays: parseInt(e.target.value) || 1,
                  })
                }
              />

              <Input
                label="バッファ日数"
                name="bufferDays"
                type="number"
                value={editingStep.bufferDays}
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    bufferDays: parseInt(e.target.value) || 0,
                  })
                }
              />

              {/* 依存関係設定 */}
              {localSteps.length > 0 && editingStep.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    依存するステップ
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {localSteps
                      .filter((s) => s.id !== editingStep.id)
                      .map((step) => (
                        <label key={step.id} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={editingStep.dependsOnJson?.includes(step.order) || false}
                            onChange={(e) => {
                              const deps = editingStep.dependsOnJson || [];
                              if (e.target.checked) {
                                setEditingStep({
                                  ...editingStep,
                                  dependsOnJson: [...deps, step.order],
                                });
                              } else {
                                setEditingStep({
                                  ...editingStep,
                                  dependsOnJson: deps.filter((d) => d !== step.order),
                                });
                              }
                            }}
                          />
                          <span className="text-sm">{step.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStepForm(false);
                  setEditingStep(null);
                }}
              >
                キャンセル
              </Button>
              <Button onClick={handleSaveStep}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}