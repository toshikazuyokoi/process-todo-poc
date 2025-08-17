'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProcessTemplate, Case } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { ArrowLeft, Save, Loader2, Calendar } from 'lucide-react'

interface CaseFormProps {
  caseId?: number
  templateId?: number
}

export function CaseForm({ caseId, templateId }: CaseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  // 30日後の日付をYYYY-MM-DD形式で設定
  const defaultGoalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  
  const [caseData, setCaseData] = useState<Partial<Case>>({
    title: '',
    processId: templateId || 0,
    goalDateUtc: defaultGoalDate,
    status: 'OPEN',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTemplates()
    if (caseId) {
      fetchCase()
    }
  }, [caseId])

  const fetchTemplates = async () => {
    try {
      const response = await api.getProcessTemplates()
      setTemplates(response.data.filter((t: ProcessTemplate) => t.isActive))
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchCase = async () => {
    if (!caseId) return
    
    setLoading(true)
    try {
      const response = await api.getCase(caseId)
      setCaseData(response.data)
    } catch (error) {
      console.error('Failed to fetch case:', error)
      alert('案件の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!caseData.title?.trim()) {
      newErrors.title = '案件名は必須です'
    }
    
    const processIdNum = Number(caseData.processId)
    if (!processIdNum || processIdNum === 0 || isNaN(processIdNum)) {
      newErrors.processId = 'プロセステンプレートを選択してください'
    }
    
    if (!caseData.goalDateUtc) {
      newErrors.goalDateUtc = 'ゴール日付は必須です'
    } else {
      const goalDate = new Date(caseData.goalDateUtc)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (goalDate < today) {
        newErrors.goalDateUtc = 'ゴール日付は今日以降の日付を選択してください'
      }
    }
    
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
      // 日付をISO形式に変換（YYYY-MM-DD -> ISO8601）
      const goalDateISO = caseData.goalDateUtc ? 
        new Date(caseData.goalDateUtc + 'T00:00:00Z').toISOString() : 
        new Date().toISOString()
      
      // processIdを数値に変換
      const processIdNum = Number(caseData.processId)
      
      // デバッグ用: 送信データをログ出力
      console.log('Case data:', caseData)
      console.log('processId type:', typeof caseData.processId, 'value:', caseData.processId)
      console.log('processIdNum type:', typeof processIdNum, 'value:', processIdNum)
      console.log('Sending payload:', {
        title: caseData.title,
        processId: processIdNum,
        goalDateUtc: goalDateISO,
      })
      
      // 新規作成時はstatusを送らない（processIdは数値として送信）
      const createPayload = {
        title: caseData.title,
        processId: processIdNum,
        goalDateUtc: goalDateISO,
      }
      
      // 更新時はstatusも含める
      const updatePayload = {
        ...createPayload,
        status: caseData.status,
      }
      
      if (caseId) {
        await api.updateCase(caseId, updatePayload)
        alert('案件を更新しました')
        router.push(`/cases/${caseId}`)
      } else {
        const response = await api.createCase(createPayload)
        alert('案件を作成しました')
        router.push(`/cases/${response.data.id}`)
      }
    } catch (error: any) {
      console.error('Failed to save case:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      
      if (error.response?.status === 400) {
        const message = error.response?.data?.message || 
                       error.response?.data?.error || 
                       JSON.stringify(error.response?.data) || 
                       'リクエストデータが不正です'
        alert(`保存エラー (400): ${message}`)
      } else if (error.response?.status === 404) {
        alert('指定されたテンプレートが見つかりません')
      } else {
        alert(`保存に失敗しました: ${error.message}`)
      }
    } finally {
      setSaving(false)
    }
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
            {caseId ? '案件編集' : '新規案件作成'}
          </h1>
        </div>
        
        <Button type="submit" disabled={saving} data-testid="save-button">
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
            label="案件名"
            name="title"
            value={caseData.title || ''}
            onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
            error={errors.title}
            required
          />
          
          <Select
            label="プロセステンプレート"
            name="process-template"
            value={caseData.processId?.toString() || ''}
            onChange={(e) => setCaseData({ ...caseData, processId: parseInt(e.target.value) })}
            error={errors.processId}
            disabled={!!caseId}
            options={[
              { value: '', label: '選択してください' },
              ...templates.map(t => ({
                value: t.id!.toString(),
                label: `${t.name} (v${t.version})`,
              })),
            ]}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ゴール日付
            </label>
            <div className="relative">
              <input
                type="date"
                value={caseData.goalDateUtc || ''}
                onChange={(e) => setCaseData({ ...caseData, goalDateUtc: e.target.value })}
                className={`block w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.goalDateUtc ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.goalDateUtc && (
              <p className="mt-1 text-sm text-red-600">{errors.goalDateUtc}</p>
            )}
          </div>
          
          <Select
            label="ステータス"
            value={caseData.status || 'OPEN'}
            onChange={(e) => setCaseData({ ...caseData, status: e.target.value as Case['status'] })}
            options={[
              { value: 'OPEN', label: 'オープン' },
              { value: 'IN_PROGRESS', label: '進行中' },
              { value: 'COMPLETED', label: '完了' },
              { value: 'CANCELLED', label: 'キャンセル' },
            ]}
          />
        </div>
      </div>

      {/* テンプレートプレビュー */}
      {caseData.processId && caseData.processId > 0 && (
        <TemplatePreview templateId={caseData.processId} goalDate={caseData.goalDateUtc} />
      )}
    </form>
  )
}

// テンプレートプレビューコンポーネント
function TemplatePreview({ templateId, goalDate }: { templateId: number; goalDate?: string }) {
  const [template, setTemplate] = useState<ProcessTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const response = await api.getProcessTemplate(templateId)
      setTemplate(response.data)
    } catch (error) {
      console.error('Failed to fetch template:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        選択中のテンプレート: {template.name}
      </h3>
      
      {template.stepTemplates && template.stepTemplates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            このテンプレートには{template.stepTemplates.length}個のステップが含まれています
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">順序</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ステップ名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">基準</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">所要日数</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {template.stepTemplates.map((step) => (
                  <tr key={step.id || step.seq}>
                    <td className="px-4 py-2 text-sm text-gray-900">{step.seq}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{step.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {step.basis === 'goal' ? 'ゴール基準' : '前工程基準'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {step.offsetDays > 0 ? '+' : ''}{step.offsetDays}日
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}// Force reload Sun Aug 10 14:18:21 JST 2025
