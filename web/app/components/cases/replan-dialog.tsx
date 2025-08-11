'use client'

import { useState } from 'react'
import { Case, ReplanPreview, StepInstance } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Calendar, AlertTriangle, Loader2, X } from 'lucide-react'

interface ReplanDialogProps {
  caseData: Case
  steps: StepInstance[]
  onClose: () => void
  onReplan: () => void
}

export function ReplanDialog({ caseData, steps, onClose, onReplan }: ReplanDialogProps) {
  const [newGoalDate, setNewGoalDate] = useState(caseData.goalDateUtc)
  const [lockedStepIds, setLockedStepIds] = useState<number[]>(
    steps.filter(s => s.locked).map(s => s.id!)
  )
  const [preview, setPreview] = useState<ReplanPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const handlePreview = async () => {
    if (!newGoalDate) return
    
    setLoading(true)
    try {
      const response = await api.previewReplan(caseData.id!, {
        goalDateUtc: newGoalDate,
        lockedStepIds,
      })
      setPreview(response.data)
    } catch (error) {
      console.error('Failed to preview replan:', error)
      alert('再計画プレビューの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!preview) return
    
    setApplying(true)
    try {
      await api.applyReplan(caseData.id!, {
        goalDateUtc: newGoalDate,
        lockedStepIds,
      })
      alert('再計画を適用しました')
      onReplan()
      onClose()
    } catch (error) {
      console.error('Failed to apply replan:', error)
      alert('再計画の適用に失敗しました')
    } finally {
      setApplying(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const getDiffDays = (oldDate: string | null, newDate: string | null) => {
    if (!oldDate || !newDate) return 0
    const diff = new Date(newDate).getTime() - new Date(oldDate).getTime()
    return Math.round(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">再計画</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 入力フォーム */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新しいゴール日付
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                />
                <Button onClick={handlePreview} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-1" />
                      プレビュー
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                現在のゴール: {formatDate(caseData.goalDateUtc)}
              </p>
            </div>
            
            {/* ロックするステップの選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付を固定するステップ
              </label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {steps.map((step) => (
                  <label key={step.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={lockedStepIds.includes(step.id!)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLockedStepIds([...lockedStepIds, step.id!])
                        } else {
                          setLockedStepIds(lockedStepIds.filter(id => id !== step.id))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {step.name} ({formatDate(step.dueDateUtc)})
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                選択されたステップの日付は変更されません
              </p>
            </div>
          </div>
          
          {/* プレビュー結果 */}
          {preview && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">再計画サマリー</h3>
                <div className="text-sm space-y-1">
                  <p>ゴール日付: {formatDate(preview.oldGoalDate)} → {formatDate(preview.newGoalDate)}</p>
                  <p>変更されるステップ: {preview.diffs.filter(d => !d.isLocked).length}件</p>
                  <p>固定されるステップ: {preview.diffs.filter(d => d.isLocked).length}件</p>
                </div>
              </div>
              
              {/* クリティカルパス */}
              {preview.criticalPath.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <h3 className="font-medium">クリティカルパス</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    以下のステップが最も時間的制約が厳しいパスです：
                  </p>
                  <div className="mt-2 text-sm">
                    {preview.criticalPath.map((stepId, index) => {
                      const step = preview.diffs.find(d => d.stepId === stepId)
                      return (
                        <span key={stepId}>
                          {step?.stepName}
                          {index < preview.criticalPath.length - 1 && ' → '}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* ステップ差分テーブル */}
              <div>
                <h3 className="font-medium mb-2">ステップ別変更内容</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          ステップ名
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          現在の期限
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          新しい期限
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          変更
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          状態
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.diffs.map((diff) => {
                        const daysDiff = getDiffDays(diff.oldDueDate, diff.newDueDate)
                        return (
                          <tr key={diff.stepId} className={diff.isLocked ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {diff.stepName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {formatDate(diff.oldDueDate)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {formatDate(diff.newDueDate)}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {daysDiff !== 0 && (
                                <span className={`font-medium ${
                                  daysDiff > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {daysDiff > 0 ? '+' : ''}{daysDiff}日
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {diff.isLocked && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  固定
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* フッター */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          {preview && (
            <Button onClick={handleApply} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  適用中...
                </>
              ) : (
                '再計画を適用'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}