'use client'

import { useState } from 'react'
import { StepInstance } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { StepComments } from '@/app/components/cases/step-comments'
import { AssigneeSelector } from '@/app/components/cases/assignee-selector'
import { CheckCircle, Circle, Clock, XCircle, Lock, Unlock, User, Calendar, Loader2 } from 'lucide-react'

interface StepInstanceListProps {
  steps: StepInstance[]
  onUpdate: () => void
}

export function StepInstanceList({ steps, onUpdate }: StepInstanceListProps) {
  const [updating, setUpdating] = useState<number | null>(null)

  const getStatusIcon = (status: StepInstance['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'blocked':
        return <XCircle className="w-5 h-5 text-gray-400" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const getStatusLabel = (status: StepInstance['status']) => {
    switch (status) {
      case 'done':
        return '完了'
      case 'in_progress':
        return '進行中'
      case 'blocked':
        return 'ブロック'
      case 'cancelled':
        return 'キャンセル'
      default:
        return '未着手'
    }
  }

  const getStatusColor = (status: StepInstance['status']) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'blocked':
        return 'bg-gray-100 text-gray-600'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-50 text-gray-600'
    }
  }

  const handleStatusChange = async (stepId: number, newStatus: StepInstance['status']) => {
    setUpdating(stepId)
    try {
      await api.updateStepStatus(stepId, newStatus)
      onUpdate()
    } catch (error) {
      console.error('Failed to update step status:', error)
      alert('ステータスの更新に失敗しました')
    } finally {
      setUpdating(null)
    }
  }

  const handleLockToggle = async (stepId: number, currentLocked: boolean) => {
    setUpdating(stepId)
    try {
      if (currentLocked) {
        await api.unlockStep(stepId)
      } else {
        await api.lockStep(stepId)
      }
      onUpdate()
    } catch (error) {
      console.error('Failed to toggle lock:', error)
      alert('ロック状態の変更に失敗しました')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const formatted = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
    
    if (diffDays === 0) {
      return `${formatted} (今日)`
    } else if (diffDays === 1) {
      return `${formatted} (明日)`
    } else if (diffDays === -1) {
      return `${formatted} (昨日)`
    } else if (diffDays > 0) {
      return `${formatted} (${diffDays}日後)`
    } else {
      return `${formatted} (${Math.abs(diffDays)}日前)`
    }
  }

  const sortedSteps = [...steps].sort((a, b) => {
    // 期限日でソート（nullは最後）
    if (!a.dueDateUtc && !b.dueDateUtc) return 0
    if (!a.dueDateUtc) return 1
    if (!b.dueDateUtc) return -1
    return new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime()
  })

  return (
    <div className="space-y-4">
      {sortedSteps.map((step) => (
        <div
          key={step.id}
          className={`border rounded-lg p-4 ${
            step.locked ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(step.status)}
                <h3 className="text-lg font-medium">{step.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(step.status)}`}>
                  {getStatusLabel(step.status)}
                </span>
                {step.locked && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    ロック中
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>期限: {formatDate(step.dueDateUtc)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <AssigneeSelector
                    stepId={step.id!}
                    currentAssigneeId={step.assigneeId}
                    onAssign={onUpdate}
                  />
                </div>
                
                <div className="text-gray-500 text-xs">
                  更新: {step.updatedAt ? new Date(step.updatedAt).toLocaleString('ja-JP') : '-'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {updating === step.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {/* ステータス変更ボタン */}
                  <div className="flex gap-1">
                    {step.status !== 'done' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusChange(step.id!, 'done')}
                        title="完了にする"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {step.status === 'todo' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusChange(step.id!, 'in_progress')}
                        title="進行中にする"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    )}
                    {step.status !== 'todo' && step.status !== 'cancelled' && step.status !== 'done' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusChange(step.id!, 'todo')}
                        title="未着手に戻す"
                      >
                        <Circle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* ロック切り替えボタン */}
                  <Button
                    size="sm"
                    variant={step.locked ? 'warning' : 'ghost'}
                    onClick={() => handleLockToggle(step.id!, step.locked)}
                    title={step.locked ? 'ロック解除' : 'ロック'}
                  >
                    {step.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Comments section */}
          {step.id && <StepComments stepId={step.id} initialCommentCount={step.commentCount} />}
        </div>
      ))}
      
      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ステップがありません
        </div>
      )}
    </div>
  )
}