'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProcessTemplate, StepTemplate } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { StepTemplateEditor } from './step-template-editor'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface ProcessTemplateFormProps {
  templateId?: number
}

export function ProcessTemplateForm({ templateId }: ProcessTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<ProcessTemplate>({
    name: '',
    version: 1,
    isActive: true,
    stepTemplates: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (templateId) {
      fetchTemplate()
    }
  }, [templateId])

  const fetchTemplate = async () => {
    if (!templateId) return
    
    setLoading(true)
    try {
      const response = await api.getProcessTemplate(templateId)
      setTemplate(response.data)
    } catch (error) {
      console.error('Failed to fetch template:', error)
      alert('テンプレートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!template.name.trim()) {
      newErrors.name = 'テンプレート名は必須です'
    }
    
    if (!template.stepTemplates || template.stepTemplates.length === 0) {
      newErrors.steps = '少なくとも1つのステップが必要です'
    }
    
    // ステップの検証
    template.stepTemplates?.forEach((step, index) => {
      if (!step.name.trim()) {
        newErrors[`step_${index}_name`] = `ステップ ${index + 1} の名前は必須です`
      }
      
      // 依存関係の循環チェック（簡易版）
      if (step.dependsOnJson && step.dependsOnJson.includes(step.seq)) {
        newErrors[`step_${index}_deps`] = `ステップ ${index + 1} は自分自身に依存できません`
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    try {
      // 新規作成時はversionとisActiveを送らない
      const createPayload = {
        name: template.name,
        stepTemplates: template.stepTemplates?.map(step => ({
          seq: step.seq,
          name: step.name,
          basis: step.basis,
          offsetDays: step.offsetDays,
          requiredArtifacts: step.requiredArtifacts || [],
          dependsOn: step.dependsOn || [],
        })) || [],
      }
      
      // 更新時はversionとisActiveも含める
      const updatePayload = {
        ...createPayload,
        version: template.version,
        isActive: template.isActive,
      }
      
      const payload = templateId ? updatePayload : createPayload
      
      if (templateId) {
        await api.updateProcessTemplate(templateId, payload)
        alert('テンプレートを更新しました')
      } else {
        const response = await api.createProcessTemplate(payload)
        alert('テンプレートを作成しました')
        router.push(`/templates/${response.data.id}`)
      }
    } catch (error: any) {
      console.error('Failed to save template:', error)
      console.log('Payload sent:', templateId ? updatePayload : createPayload) // デバッグ用
      
      if (error.response?.data?.errors) {
        // バリデーションエラーの詳細表示
        const validationErrors = error.response.data.errors
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n')
        alert(`バリデーションエラー:\n${errorMessages}`)
      } else if (error.response?.status === 409) {
        const message = error.response?.data?.message || '同じ名前のテンプレートが既に存在します'
        alert(`保存エラー: ${message}`)
      } else if (error.response?.data?.message) {
        alert(`エラー: ${error.response.data.message}`)
      } else {
        alert('保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStepsChange = (steps: StepTemplate[]) => {
    setTemplate({ ...template, stepTemplates: steps })
    // ステップ関連のエラーをクリア
    const newErrors = { ...errors }
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith('step_') || key === 'steps') {
        delete newErrors[key]
      }
    })
    setErrors(newErrors)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">
            {templateId ? 'テンプレート編集' : '新規テンプレート作成'}
          </h1>
        </div>
        
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              保存
            </>
          )}
        </Button>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">基本情報</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="テンプレート名"
            name="テンプレート名"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            error={errors.name}
            required
          />
          
          <Input
            label="バージョン"
            name="バージョン"
            type="number"
            value={template.version}
            onChange={(e) => setTemplate({ ...template, version: parseInt(e.target.value) })}
            min={1}
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={template.isActive}
            onChange={(e) => setTemplate({ ...template, isActive: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            有効化
          </label>
        </div>
      </div>

      {/* ステップテンプレート */}
      <div className="bg-white rounded-lg shadow p-6">
        {errors.steps && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm" role="alert">
            {errors.steps}
          </div>
        )}
        
        <StepTemplateEditor
          steps={template.stepTemplates || []}
          onChange={handleStepsChange}
        />
      </div>

      {/* ビジュアライゼーション（プレビュー） */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">プロセスフロー プレビュー</h2>
        <ProcessFlowPreview steps={template.stepTemplates || []} />
      </div>
    </form>
  )
}

// プロセスフロープレビューコンポーネント
function ProcessFlowPreview({ steps }: { steps: StepTemplate[] }) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ステップを追加するとプレビューが表示されます
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 pb-4">
        {steps.map((step, index) => (
          <div key={step.seq} className="flex items-center">
            <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-3 min-w-[120px] text-center">
              <div className="text-xs text-gray-600 mb-1">
                {step.basis === 'goal' ? 'ゴール基準' : '前工程基準'}
              </div>
              <div className="font-semibold text-sm">{step.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                {step.offsetDays > 0 ? '+' : ''}{step.offsetDays}日
              </div>
              {step.dependsOnJson && step.dependsOnJson.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  依存: {step.dependsOnJson.join(', ')}
                </div>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="mx-2 text-gray-400">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}