'use client'

import { useState, useEffect } from 'react'
import { StepTemplate } from '@/app/types'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Trash2, GripVertical, Plus } from 'lucide-react'

interface StepTemplateEditorProps {
  steps: StepTemplate[]
  onChange: (steps: StepTemplate[]) => void
}

export function StepTemplateEditor({ steps, onChange }: StepTemplateEditorProps) {
  const [localSteps, setLocalSteps] = useState<StepTemplate[]>(steps)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  useEffect(() => {
    setLocalSteps(steps)
  }, [steps])

  const handleAddStep = () => {
    const newStep: StepTemplate = {
      seq: localSteps.length + 1,
      name: `ステップ ${localSteps.length + 1}`,
      basis: 'prev',
      offsetDays: 1,
      requiredArtifactsJson: [],
      dependsOnJson: [],
    }
    const updatedSteps = [...localSteps, newStep]
    setLocalSteps(updatedSteps)
    onChange(updatedSteps)
  }

  const handleUpdateStep = (index: number, field: keyof StepTemplate, value: any) => {
    const updatedSteps = [...localSteps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    
    // seq更新時は依存関係も更新
    if (field === 'seq') {
      updatedSteps.sort((a, b) => a.seq - b.seq)
      updatedSteps.forEach((step, i) => {
        step.seq = i + 1
      })
    }
    
    setLocalSteps(updatedSteps)
    onChange(updatedSteps)
  }

  const handleDeleteStep = (index: number) => {
    const updatedSteps = localSteps.filter((_, i) => i !== index)
    // seq番号を振り直し
    updatedSteps.forEach((step, i) => {
      step.seq = i + 1
    })
    setLocalSteps(updatedSteps)
    onChange(updatedSteps)
  }

  const handleDependencyChange = (stepIndex: number, depSeq: number, checked: boolean) => {
    const updatedSteps = [...localSteps]
    const step = updatedSteps[stepIndex]
    
    if (!step.dependsOnJson) {
      step.dependsOnJson = []
    }
    
    if (checked) {
      step.dependsOnJson = [...step.dependsOnJson, depSeq]
    } else {
      step.dependsOnJson = step.dependsOnJson.filter(d => d !== depSeq)
    }
    
    setLocalSteps(updatedSteps)
    onChange(updatedSteps)
  }

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedItem === null) return

    const draggedStep = localSteps[draggedItem]
    const updatedSteps = [...localSteps]
    
    // Remove dragged item
    updatedSteps.splice(draggedItem, 1)
    
    // Insert at new position
    updatedSteps.splice(dropIndex, 0, draggedStep)
    
    // Update seq numbers
    updatedSteps.forEach((step, i) => {
      step.seq = i + 1
    })
    
    setLocalSteps(updatedSteps)
    onChange(updatedSteps)
    setDraggedItem(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ステップテンプレート</h3>
        <Button onClick={handleAddStep} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          ステップ追加
        </Button>
      </div>

      <div className="space-y-4">
        {localSteps.map((step, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 bg-white shadow-sm"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="flex items-start gap-4">
              <div className="cursor-move pt-2">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={`ステップ ${step.seq}: 名前`}
                    name={`ステップ-${step.seq}-名前`}
                    value={step.name}
                    onChange={(e) => handleUpdateStep(index, 'name', e.target.value)}
                  />
                  
                  <Select
                    label="基準"
                    name="基準"
                    value={step.basis}
                    onChange={(e) => handleUpdateStep(index, 'basis', e.target.value)}
                    options={[
                      { value: 'goal', label: 'ゴール基準' },
                      { value: 'prev', label: '前工程基準' },
                    ]}
                  />
                  
                  <Input
                    label="所要日数"
                    name="所要日数"
                    type="number"
                    value={step.offsetDays}
                    onChange={(e) => handleUpdateStep(index, 'offsetDays', parseInt(e.target.value))}
                  />
                </div>

                {/* 依存関係設定 */}
                {index > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      依存するステップ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {localSteps.slice(0, index).map((depStep) => (
                        <label key={depStep.seq} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-1"
                            checked={step.dependsOnJson?.includes(depStep.seq) || false}
                            onChange={(e) => handleDependencyChange(index, depStep.seq, e.target.checked)}
                          />
                          <span className="text-sm">{depStep.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteStep(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {localSteps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ステップがありません。「ステップ追加」ボタンをクリックして追加してください。
        </div>
      )}
    </div>
  )
}